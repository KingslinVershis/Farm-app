'use client';

import React, { useState } from 'react';
import {
  SettingsIcon,
  WifiIcon,
  ShieldCheckIcon,
  BellIcon,
  CheckCircleIcon,
} from '@/components/icons/Icons';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Input, Switch } from 'antd';

export default function SettingsPage() {
  const { locale } = useLanguage();
  const isTamil = locale === 'ta';

  const [telemetryInterval, setTelemetryInterval] = useState<string>('30s');
  const [starlinkBackup, setStarlinkBackup] = useState<boolean>(true);
  const [smsAlerts, setSmsAlerts] = useState<boolean>(true);
  const [frostThreshold, setFrostThreshold] = useState<string>('2.5');
  const [moistureAlert, setMoistureAlert] = useState<string>('22');
  const [savedNotification, setSavedNotification] = useState<boolean>(false);

  const handleSave = () => {
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="relative min-h-screen w-full">
      {/* Background Photography Layer for Settings */}
      <div
        className="fixed inset-0 pointer-events-none z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out scale-105"
        style={{
          backgroundImage: `url('/images/setting.png')`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 flex flex-col gap-6 fade-in">
        {/* Page Header Banner */}
        <div className="rounded-2xl glass-panel p-5 sm:p-7 shadow-xl border border-border-light flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-surface text-emerald-400 text-xs font-semibold mb-2.5 border border-emerald-500/30">
              <SettingsIcon size={14} />
              <span>{isTamil ? 'OS பதிப்பு 2.8.4 • வன்பொருள் கண்ணி திருத்தம் B' : 'OS Version 2.8.4 • Hardware Mesh Revision B'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight m-0 mb-1.5">
              {isTamil ? 'கணினி அமைப்புகள் & IoT நுழைவாயில்' : 'System Settings & IoT Gateway'}
            </h1>
            <p className="text-text-secondary text-xs sm:text-sm m-0 max-w-2xl leading-relaxed">
              {isTamil
                ? 'LoRaWAN தொலை உணர்வு இடைவெளிகள், அவசரகால வரம்புகள் மற்றும் எச்சரிக்கை நெறிமுறைகளை கட்டமைக்கவும்.'
                : 'Configure LoRaWAN telemetry frequencies, emergency thresholds, and alerting pipelines.'}
            </p>
          </div>

          {/* Save feedback button */}
          <div className="flex items-center gap-3">
            {savedNotification && (
              <span className="text-sm text-emerald-400 flex items-center gap-1.5 font-bold animate-fade-in bg-emerald-500/15 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <CheckCircleIcon size={16} />
                <span>{isTamil ? 'அமைப்புகள் சேமிக்கப்பட்டன!' : 'Settings Saved!'}</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-sm font-extrabold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-98"
            >
              <span>💾</span>
              <span>{isTamil ? 'அமைப்புகளைச் சேமி' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* IoT Gateway & LoRaWAN */}
          <div className="rounded-2xl glass-panel p-6 flex flex-col gap-4 shadow-xl border border-border-light">
            <div className="flex items-center gap-3 pb-2 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
                <WifiIcon size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-main m-0">
                  {isTamil ? 'கண்ணி நுழைவாயில் இணைப்பு' : 'Mesh Gateway Connectivity'}
                </h2>
                <span className="text-xs text-text-muted">
                  Base Station GV-GW-01 • EU868 / US915 Dual Channel
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  {isTamil ? 'சென்சார் மாதிரி விகிதம்' : 'Sensor Sample Rate'}
                </label>
                <select
                  value={telemetryInterval}
                  onChange={(e) => setTelemetryInterval(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-surface border border-border-light text-text-main text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="15s" className="bg-slate-900 text-white">{isTamil ? '15 வினாடிகள் (அதிதுல்லிய சோதனை)' : '15 Seconds (High Precision Testing)'}</option>
                  <option value="30s" className="bg-slate-900 text-white">{isTamil ? '30 வினாடிகள் (இயல்புநிலை வேளாண்மை தரநிலை)' : '30 Seconds (Default Agricultural Standard)'}</option>
                  <option value="60s" className="bg-slate-900 text-white">{isTamil ? '60 வினாடிகள் (மின்கல சேமிப்பு முறை)' : '60 Seconds (Power-Saving Mode)'}</option>
                  <option value="5m" className="bg-slate-900 text-white">{isTamil ? '5 நிமிடங்கள் (குறைந்த அலைவரிசை முறை)' : '5 Minutes (Low Bandwidth Hibernation)'}</option>
                </select>
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-xl glass-surface border border-border-subtle">
                <div className="pr-2">
                  <span className="text-xs font-bold text-text-main block mb-0.5">
                    {isTamil ? 'செயற்கைக்கோள் மாற்று இணைப்பு' : 'Satellite Uplink Failover'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {isTamil ? '4G தடைபட்டால் ஸ்டார்லிங்க் வணிக இணைப்பிற்கு மாறு' : 'Auto-switch to Starlink Business dish if 4G drops'}
                  </span>
                </div>
                <Switch
                  checked={starlinkBackup}
                  onChange={(checked) => setStarlinkBackup(checked)}
                />
              </div>
            </div>
          </div>

          {/* Automated Alert Thresholds */}
          <div className="rounded-2xl glass-panel p-6 flex flex-col gap-4 shadow-xl border border-border-light">
            <div className="flex items-center gap-3 pb-2 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <BellIcon size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-main m-0">
                  {isTamil ? 'வேளாண் ஆபத்து எச்சரிக்கைகள்' : 'Agronomic Hazard Alerts'}
                </h2>
                <span className="text-xs text-text-muted">
                  {isTamil ? 'வயல் மேலாளர்களுக்கு தானியங்கி அலாரங்கள்' : 'Real-time automated alarms sent to field managers'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  {isTamil ? 'பனி உறைவு எச்சரிக்கை புள்ளி (°C)' : 'Frost Warning Trigger Point (°C)'}
                </label>
                <Input
                  type="number"
                  step="0.5"
                  value={frostThreshold}
                  onChange={(e) => setFrostThreshold(e.target.value)}
                  className="w-full text-sm font-semibold glass-input h-10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  {isTamil ? 'ஆபத்தான மண் ஈரப்பதம் பற்றாக்குறை (%)' : 'Critical Soil Moisture Deficit (%)'}
                </label>
                <Input
                  type="number"
                  value={moistureAlert}
                  onChange={(e) => setMoistureAlert(e.target.value)}
                  className="w-full text-sm font-semibold glass-input h-10 rounded-xl"
                />
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-xl glass-surface border border-border-subtle">
                <div className="pr-2">
                  <span className="text-xs font-bold text-text-main block mb-0.5">
                    {isTamil ? 'அவசர SMS அனுப்புதல்' : 'Emergency SMS Dispatch'}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {isTamil ? 'பனி/குழாய் வெடிப்பின் போது உடனடி SMS அனுப்பு' : 'Send immediate SMS to farm manager on frost/pipe rupture'}
                  </span>
                </div>
                <Switch
                  checked={smsAlerts}
                  onChange={(checked) => setSmsAlerts(checked)}
                />
              </div>
            </div>
          </div>

          {/* Farm Profile & Authorized Personnel */}
          <div className="rounded-2xl glass-panel p-6 flex flex-col gap-4 shadow-xl border border-border-light">
            <div className="flex items-center gap-3 pb-2 border-b border-border-subtle">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <ShieldCheckIcon size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-main m-0">
                  {isTamil ? 'அனுமதி & பொறுப்புகள்' : 'Enterprise Access & Roles'}
                </h2>
                <span className="text-xs text-text-muted">
                  {isTamil ? 'செயலில் உள்ள இயக்குநர்கள் & வல்லுநர்கள்' : 'Active operators and agronomists'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {[
                {
                  name: 'Dr. Sarah Lin',
                  role: isTamil ? 'முதன்மை வேளாண் வல்லுநர்' : 'Head Agronomist',
                  email: 's.lin@greenvalley.ag',
                  badge: 'Admin',
                },
                {
                  name: 'Marco Rossi',
                  role: isTamil ? 'இயந்திர செயல்பாடுகள்' : 'Fleet & Machinery Ops',
                  email: 'm.rossi@greenvalley.ag',
                  badge: 'Operator',
                },
                {
                  name: 'Elena Torres',
                  role: isTamil ? 'நீரியல் பொறியாளர்' : 'Hydrology Engineer',
                  email: 'e.torres@greenvalley.ag',
                  badge: 'Operator',
                },
              ].map((member) => (
                <div
                  key={member.email}
                  className="flex justify-between items-center p-3 rounded-xl glass-surface border border-border-subtle hover:border-emerald-500/30 transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-text-main">{member.name}</div>
                    <div className="text-[11px] text-text-muted">{member.role} • {member.email}</div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                      member.badge === 'Admin'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'glass-surface text-text-secondary border-border-light'
                    }`}
                  >
                    {member.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
