import dns from 'dns';
import net from 'net';
import validateEmail from 'deep-email-validator';

// Ensure standard public DNS resolvers if local loopback is returned (common on Windows)
try {
  const currentServers = dns.getServers();
  if (!currentServers || currentServers.length === 0 || currentServers.every(s => s === '127.0.0.1')) {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  }
} catch {
  // Ignore DNS server override errors
}

export interface EmailValidationResult {
  valid: boolean;
  reason?: 'regex' | 'typo' | 'disposable' | 'mx' | 'smtp' | string;
  error?: string;
  details?: Record<string, any>;
}

/**
 * Validates an email address using:
 * 1. Regex syntax check
 * 2. Typo domain check (e.g., catches gamil.com, yaho.com)
 * 3. Disposable/temporary burner email check (e.g., mailinator.com)
 * 4. DNS MX record resolution
 * 5. Live SMTP handshake check (verifying recipient mailbox on active mail servers)
 */
export async function validateUserEmail(
  email: string,
  sender = 'verify@farmhub.in'
): Promise<EmailValidationResult> {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Run deep-email-validator for syntax, typo, disposable, and MX resolution
  let baseValidation: any;
  try {
    baseValidation = await validateEmail({
      email: cleanEmail,
      sender,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      validateSMTP: false, // We perform an intelligent SMTP handshake below to handle reputation firewalls (e.g. Microsoft Spamhaus blocks on dynamic IPs)
    });
  } catch (err: any) {
    return {
      valid: false,
      reason: 'regex',
      error: 'Invalid email syntax or format',
    };
  }

  if (!baseValidation.valid) {
    const reason = baseValidation.reason || 'regex';
    let errorMessage = 'Invalid email address';

    if (reason === 'regex') {
      errorMessage = baseValidation.validators?.regex?.reason || 'Please enter a valid email format';
    } else if (reason === 'typo') {
      errorMessage = baseValidation.validators?.typo?.reason || 'Likely email domain typo. Did you mean gmail.com or outlook.com?';
    } else if (reason === 'disposable') {
      errorMessage = 'Disposable and temporary burner email addresses are not permitted.';
    } else if (reason === 'mx') {
      errorMessage = 'Email domain has no valid mail exchange (MX) servers.';
    }

    return {
      valid: false,
      reason,
      error: errorMessage,
      details: baseValidation.validators,
    };
  }

  // 2. Resolve MX records for the domain
  const parts = cleanEmail.split('@');
  const domain = parts[1];
  if (!domain) {
    return { valid: false, reason: 'regex', error: 'Missing domain in email address' };
  }

  const mxRecords: dns.MxRecord[] = await new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        return resolve([]);
      }
      addresses.sort((a, b) => a.priority - b.priority);
      resolve(addresses);
    });
  });

  if (mxRecords.length === 0) {
    return {
      valid: false,
      reason: 'mx',
      error: 'The domain does not have active mail exchanger (MX) records.',
    };
  }

  const primaryMx = mxRecords[0].exchange;

  // 3. Live SMTP Handshake Verification
  const smtpCheck = await new Promise<EmailValidationResult>((resolve) => {
    let completed = false;
    const socket = net.createConnection(25, primaryMx);
    socket.setTimeout(6000); // 6s timeout

    const finish = (result: EmailValidationResult) => {
      if (!completed) {
        completed = true;
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {
          // Ignore socket destruction errors
        }
        resolve(result);
      }
    };

    let step = 0;
    socket.on('data', (data) => {
      const msg = data.toString();

      // Step 0: Server Greeting (220)
      if (step === 0 && msg.includes('220')) {
        step = 1;
        socket.write('HELO farmhub.in\r\n');
      } else if (step === 1) {
        // Step 1: HELO response (250)
        if (msg.includes('250')) {
          step = 2;
          socket.write(`MAIL FROM: <${sender}>\r\n`);
        } else {
          // HELO blocked or rejected by policy -> domain is still verified via MX
          finish({ valid: true, reason: 'smtp', details: { note: 'HELO policy restriction on MX' } });
        }
      } else if (step === 2) {
        // Step 2: MAIL FROM response (250)
        if (msg.includes('250')) {
          step = 3;
          socket.write(`RCPT TO: <${cleanEmail}>\r\n`);
        } else if (
          msg.includes('550') &&
          (msg.includes('Spamhaus') || msg.includes('Service unavailable') || msg.includes('Client host blocked'))
        ) {
          // Mail server blocks dynamic/sender host IP on port 25 (e.g. Microsoft Spamhaus PBL).
          // The domain and MX records are verified, so don't reject valid Microsoft/corporate accounts.
          finish({ valid: true, reason: 'smtp', details: { note: 'Client IP filtered by MX policy' } });
        } else {
          finish({ valid: true, reason: 'smtp', details: { note: 'MAIL FROM rejected by policy' } });
        }
      } else if (step === 3) {
        // Step 3: RCPT TO response
        if (msg.includes('250')) {
          // Recipient mailbox explicitly accepted by mail server!
          finish({ valid: true, reason: 'smtp', details: { verified: true } });
        } else if (msg.includes('550')) {
          if (
            msg.includes('Spamhaus') ||
            msg.includes('Client host blocked') ||
            msg.includes('Service unavailable')
          ) {
            // Sender IP blocked by Spamhaus / policy (e.g. Microsoft Outlook/Hotmail)
            finish({ valid: true, reason: 'smtp', details: { note: 'Client IP filtered by MX policy' } });
          } else if (
            msg.includes('5.1.1') ||
            msg.toLowerCase().includes('nosuchuser') ||
            msg.toLowerCase().includes('does not exist') ||
            msg.toLowerCase().includes('user unknown') ||
            msg.toLowerCase().includes('recipient address rejected')
          ) {
            // Mailbox explicitly does not exist on mail server (e.g. Google Gmail 550 5.1.1)
            finish({
              valid: false,
              reason: 'smtp',
              error: 'This email account does not exist or was rejected by the mail server.',
            });
          } else {
            finish({
              valid: false,
              reason: 'smtp',
              error: 'The mailbox was rejected by the recipient mail server.',
            });
          }
        } else if (msg.includes('452')) {
          // Mailbox full -> user exists
          finish({ valid: true, reason: 'smtp', details: { verified: true, mailboxFull: true } });
        } else {
          // Other temporary/policy responses
          finish({ valid: true, reason: 'smtp', details: { note: msg.trim().substring(0, 80) } });
        }
      }
    });

    socket.on('error', (err) => {
      // If port 25 is blocked or reset by ISP/local firewall, don't falsely fail users whose MX is valid
      finish({ valid: true, reason: 'smtp', details: { connectionError: err.message } });
    });

    socket.on('timeout', () => {
      // If SMTP handshake times out, allow valid MX domain
      finish({ valid: true, reason: 'smtp', details: { timeout: true } });
    });
  });

  return smtpCheck;
}

