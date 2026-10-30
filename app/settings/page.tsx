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
    <div className="fade-in flex flex-col gap-7">
      {/* Page Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-slate-300 text-xs font-semibold mb-2 border border-slate-700/60">
            <SettingsIcon size={14} />
            {isTamil ? 'OS பதிப்பு 2.8.4 • வன்பொருள் கண்ணி திருத்தம் B' : 'OS Version 2.8.4 • Hardware Mesh Revision B'}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight m-0 mb-1.5">
            {isTamil ? 'கணினி அமைப்புகள் & IoT நுழைவாயில்' : 'System Settings & IoT Gateway'}
          </h1>
          <p className="text-slate-400 text-sm m-0 max-w-2xl">
            {isTamil
              ? 'LoRaWAN தொலை உணர்வு இடைவெளிகள், அவசரகால வரம்புகள் மற்றும் எச்சரிக்கை நெறிமுறைகளை கட்டமைக்கவும்.'
              : 'Configure LoRaWAN telemetry frequencies, emergency thresholds, and alerting pipelines.'}
          </p>
        </div>

        {/* Save feedback button */}
        <div className="flex items-center gap-3">
          {savedNotification && (
            <span className="text-sm text-emerald-400 flex items-center gap-1.5 font-semibold animate-fade-in">
              <CheckCircleIcon size={16} />
              {isTamil ? 'அமைப்புகள் சேமிக்கப்பட்டன!' : 'Settings Saved!'}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
          >
            {isTamil ? 'அமைப்புகளைச் சேமி' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* IoT Gateway & LoRaWAN */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
              <WifiIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 m-0">
                {isTamil ? 'கண்ணி நுழைவாயில் இணைப்பு' : 'Mesh Gateway Connectivity'}
              </h2>
              <span className="text-xs text-slate-400">
                Base Station GV-GW-01 • EU868 / US915 Dual Channel
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isTamil ? 'சென்சார் மாதிரி விகிதம்' : 'Sensor Sample Rate'}
              </label>
              <select
                value={telemetryInterval}
                onChange={(e) => setTelemetryInterval(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-slate-700/80 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="15s" className="bg-slate-900">{isTamil ? '15 வினாடிகள் (அதிதுல்லிய சோதனை)' : '15 Seconds (High Precision Testing)'}</option>
                <option value="30s" className="bg-slate-900">{isTamil ? '30 வினாடிகள் (இயல்புநிலை வேளாண்மை தரநிலை)' : '30 Seconds (Default Agricultural Standard)'}</option>
                <option value="60s" className="bg-slate-900">{isTamil ? '60 வினாடிகள் (மின்கல சேமிப்பு முறை)' : '60 Seconds (Power-Saving Mode)'}</option>
                <option value="5m" className="bg-slate-900">{isTamil ? '5 நிமிடங்கள் (குறைந்த அலைவரிசை முறை)' : '5 Minutes (Low Bandwidth Hibernation)'}</option>
              </select>
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-xl bg-black/30 border border-slate-800/60">
              <div>
                <span className="text-xs font-semibold text-slate-200 block mb-0.5">
                  {isTamil ? 'செயற்கைக்கோள் மாற்று இணைப்பு' : 'Satellite Uplink Failover'}
                </span>
                <span className="text-[11px] text-slate-400">
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
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
              <BellIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 m-0">
                {isTamil ? 'வேளாண் ஆபத்து எச்சரிக்கைகள்' : 'Agronomic Hazard Alerts'}
              </h2>
              <span className="text-xs text-slate-400">
                {isTamil ? 'வயல் மேலாளர்களுக்கு தானியங்கி அலாரங்கள்' : 'Real-time automated alarms sent to field managers'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isTamil ? 'பனி உறைவு எச்சரிக்கை புள்ளி (°C)' : 'Frost Warning Trigger Point (°C)'}
              </label>
              <Input
                type="number"
                step="0.5"
                value={frostThreshold}
                onChange={(e) => setFrostThreshold(e.target.value)}
                className="w-full text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isTamil ? 'ஆபத்தான மண் ஈரப்பதம் பற்றாக்குறை (%)' : 'Critical Soil Moisture Deficit (%)'}
              </label>
              <Input
                type="number"
                value={moistureAlert}
                onChange={(e) => setMoistureAlert(e.target.value)}
                className="w-full text-sm font-medium"
              />
            </div>

            <div className="flex justify-between items-center p-3.5 rounded-xl bg-black/30 border border-slate-800/60">
              <div>
                <span className="text-xs font-semibold text-slate-200 block mb-0.5">
                  {isTamil ? 'அவசர SMS அனுப்புதல்' : 'Emergency SMS Dispatch'}
                </span>
                <span className="text-[11px] text-slate-400">
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
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShieldCheckIcon size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 m-0">
                {isTamil ? 'அனுமதி & பொறுப்புகள்' : 'Enterprise Access & Roles'}
              </h2>
              <span className="text-xs text-slate-400">
                {isTamil ? 'செயலில் உள்ள இயக்குநர்கள் & வல்லுநர்கள்' : 'Active operators and agronomists'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
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
                className="flex justify-between items-center p-3 rounded-xl bg-black/30 border border-slate-800/60"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">{member.name}</div>
                  <div className="text-[11px] text-slate-400">{member.role} • {member.email}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    member.badge === 'Admin'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-slate-300 border-slate-700/60'
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
  );
}
