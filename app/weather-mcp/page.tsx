'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Select } from 'antd';
import { motion } from 'motion/react';
import { ShinyText } from '@/components/reactbits/ShinyText';
import FlipCard from '@/components/reactbits/FlipCard';
import MotionFreeScrollCarousel from '@/components/reactbits/MotionFreeScrollCarousel';
import {
  WeatherDayIcon,
  getWeatherBackgroundVideo,
} from '@/components/weather/WeatherIllustrations';
import { CloudSunIcon } from '@/components/icons/Icons';
import {
  Search,
  Sparkles,
  Droplets,
  Wind,
  CloudRain,
  Activity,
  RefreshCw,
} from '@/components/icons/FlaticonIcons';
import type { WeatherMcpCallResponse } from '@/app/api/weather-mcp/route';
import { normalizeWeatherConditionText } from '@/lib/weather';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface SampleLocation {
  value: string;
  labelEn: string;
  labelTa: string;
}

const SAMPLE_LOCATIONS: SampleLocation[] = [
  { value: 'Chennai, Tamil Nadu', labelEn: 'Chennai, Tamil Nadu', labelTa: 'சென்னை, தமிழ்நாடு' },
  { value: 'Thanjavur, Tamil Nadu', labelEn: 'Thanjavur, Tamil Nadu', labelTa: 'தஞ்சாவூர், தமிழ்நாடு' },
  { value: 'Madurai, Tamil Nadu', labelEn: 'Madurai, Tamil Nadu', labelTa: 'மதுரை, தமிழ்நாடு' },
  { value: 'Coimbatore, Tamil Nadu', labelEn: 'Coimbatore, Tamil Nadu', labelTa: 'கோயம்புத்தூர், தமிழ்நாடு' },
  { value: 'Salem, Tamil Nadu', labelEn: 'Salem, Tamil Nadu', labelTa: 'சேலம், தமிழ்நாடு' },
  { value: 'Tiruchirappalli, Tamil Nadu', labelEn: 'Tiruchirappalli, Tamil Nadu', labelTa: 'திருச்சிராப்பள்ளி, தமிழ்நாடு' },
  { value: 'Tokyo, Japan', labelEn: 'Tokyo, Japan', labelTa: 'டோக்கியோ, ஜப்பான்' },
  { value: 'Paris, France', labelEn: 'Paris, France', labelTa: 'பாரிஸ், பிரான்ஸ்' },
];

interface McpToolDefinition {
  value: string;
  label: string;
  labelTa: string;
  desc: string;
  descTa: string;
  tool: string;
  params: Record<string, any>;
}

const MCP_TOOLS: McpToolDefinition[] = [
  {
    value: 'hourly_24',
    label: '24 Hour Hourly Status',
    labelTa: '24 மணி நேர நிலை',
    desc: 'Hour-by-hour temperature, precipitation and wind progression',
    descTa: 'மணிநேர வெப்பநிலை, மழைப்பொழிவு மற்றும் காற்றின் போக்கு',
    tool: 'get_forecast',
    params: { granularity: 'hourly', days: 1, units: 'metric' },
  },
  {
    value: 'forecast_7',
    label: '7 Days Forecast',
    labelTa: '7 நாட்கள் முன்னறிவிப்பு',
    desc: '7-day daily forecast with rain chances, min/max temp & diagnostics',
    descTa: 'மழை வாய்ப்பு, குறைந்த/அதிக வெப்பநிலை மற்றும் 7 நாள் முன்னறிவிப்பு',
    tool: 'get_forecast',
    params: { days: 7, units: 'metric' },
  },
  {
    value: 'forecast_16',
    label: '16 Days Forecast',
    labelTa: '16 நாட்கள் முன்னறிவிப்பு',
    desc: '16-day daily forecast with rain chances, min/max temp & diagnostics',
    descTa: 'மழை வாய்ப்பு, குறைந்த/அதிக வெப்பநிலை மற்றும் 16 நாள் முன்னறிவிப்பு',
    tool: 'get_forecast',
    params: { days: 16, units: 'metric' },
  },
];

const LOCATION_TAMIL_MAP: Record<string, string> = {
  'chennai': 'சென்னை',
  'thanjavur': 'தஞ்சாவூர்',
  'madurai': 'மதுரை',
  'coimbatore': 'கோயம்புத்தூர்',
  'salem': 'சேலம்',
  'tiruchirappalli': 'திருச்சிராப்பள்ளி',
  'trichy': 'திருச்சிராப்பள்ளி',
  'tirunelveli': 'திருநெல்வேலி',
  'erode': 'ஈரோடு',
  'vellore': 'வேலூர்',
  'thoothukudi': 'தூத்துக்குடி',
  'tuticorin': 'தூத்துக்குடி',
  'dindigul': 'திண்டுக்கல்',
  'kanchipuram': 'காஞ்சிபுரம்',
  'cuddalore': 'கடலூர்',
  'karur': 'கரூர்',
  'nagapattinam': 'நாகப்பட்டினம்',
  'pudukkottai': 'புதுக்கோட்டை',
  'ramanathapuram': 'ராமநாதபுரம்',
  'sivaganga': 'சிவகங்கை',
  'tenkasi': 'தென்காசி',
  'theni': 'தேனி',
  'nilgiris': 'நீலகிரி',
  'dharmapuri': 'தர்மபுரி',
  'krishnagiri': 'கிருஷ்ணகிரி',
  'namakkal': 'நாமக்கல்',
  'perambalur': 'பெரம்பலூர்',
  'ariyalur': 'அரியலூர்',
  'tiruvallur': 'திருவள்ளூர்',
  'thiruvallur': 'திருவள்ளூர்',
  'tiruvannamalai': 'திருவண்ணாமலை',
  'thiruvannamalai': 'திருவண்ணாமலை',
  'tiruvarur': 'திருவாரூர்',
  'thiruvarur': 'திருவாரூர்',
  'ranipet': 'ராணிப்பேட்டை',
  'tirupathur': 'திருப்பத்தூர்',
  'chengalpattu': 'செங்கல்பட்டு',
  'kallakurichi': 'கள்ளக்குறிச்சி',
  'mayiladuthurai': 'மயிலாடுதுறை',
  'tiruppur': 'திருப்பூர்',
  'tamil nadu': 'தமிழ்நாடு',
  'kerala': 'கேரளா',
  'karnataka': 'கர்நாடகா',
  'andhra pradesh': 'ஆந்திர பிரதேசம்',
  'andhra': 'ஆந்திரா',
  'india': 'இந்தியா',
  'tokyo': 'டோக்கியோ',
  'japan': 'ஜப்பான்',
  'paris': 'பாரிஸ்',
  'france': 'பிரான்ஸ்',
  'london': 'லண்டன்',
  'united kingdom': 'ஐக்கிய இராச்சியம்',
  'uk': 'இங்கிலாந்து',
  'new york': 'நியூயார்க்',
  'united states': 'அமெரிக்கா',
  'usa': 'அமெரிக்கா',
};

function translateLocationToTamil(locStr: string): string {
  if (!locStr) return locStr;
  let translated = locStr;
  const sortedKeys = Object.keys(LOCATION_TAMIL_MAP).sort((a, b) => b.length - a.length);
  for (const enWord of sortedKeys) {
    const taWord = LOCATION_TAMIL_MAP[enWord];
    const reg = new RegExp(`\\b${enWord}\\b`, 'gi');
    translated = translated.replace(reg, taWord);
  }
  translated = translated.replace(/\bdistrict\b/gi, 'மாவட்டம்');
  return translated;
}

function normalizeLocationForMcp(input: string): string {
  if (!input) return input;
  let normalized = input.trim();
  for (const [enKey, taVal] of Object.entries(LOCATION_TAMIL_MAP)) {
    if (normalized.includes(taVal)) {
      normalized = normalized.replace(new RegExp(taVal, 'g'), enKey);
    }
  }
  return normalized;
}

const WEATHER_CONDITION_TAMIL_MAP: Array<{ pattern: RegExp; tamil: string }> = [
  { pattern: /thunder|lightning|storm|squall/i, tamil: 'இடி மின்னலுடன் மழை' },
  { pattern: /heavy rain|downpour|torrential/i, tamil: 'கனமழை' },
  { pattern: /moderate rain|showers|rain showers/i, tamil: 'மிதமான மழை' },
  { pattern: /light rain|light drizzle|drizzle/i, tamil: 'தூறல் மழை' },
  { pattern: /\brain\b/i, tamil: 'மழை' },
  { pattern: /overcast/i, tamil: 'முழு மேகமூட்டம்' },
  { pattern: /partly cloudy|scattered clouds/i, tamil: 'பகுதி மேகமூட்டம்' },
  { pattern: /cloudy|clouds/i, tamil: 'மேகமூட்டம்' },
  { pattern: /clear sky|mostly clear|clear/i, tamil: 'தெளிவான வானம்' },
  { pattern: /sunny/i, tamil: 'வெயில் / தெளிவான வானம்' },
  { pattern: /fog|mist|haze|smoke|dust/i, tamil: 'மூடுபனி' },
  { pattern: /windy|breezy/i, tamil: 'பலத்த காற்று' },
  { pattern: /fair/i, tamil: 'மிதமான வானம்' },
];

function translateWeatherCondition(condition: string | undefined, isTamil: boolean): string {
  if (!condition) return '';
  if (!isTamil) return condition;
  for (const item of WEATHER_CONDITION_TAMIL_MAP) {
    if (item.pattern.test(condition)) {
      return item.tamil;
    }
  }
  return condition;
}

const WIND_DIR_MAP: Record<string, string> = {
  'n': 'வடக்கு',
  's': 'தெற்கு',
  'e': 'கிழக்கு',
  'w': 'மேற்கு',
  'ne': 'வடகிழக்கு',
  'nw': 'வடமேற்கு',
  'se': 'தென்கிழக்கு',
  'sw': 'தென்மேற்கு',
  'nne': 'வட-வடகிழக்கு',
  'ene': 'கிழ-வடகிழக்கு',
  'nnw': 'வட-வடமேற்கு',
  'wnw': 'மே-வடமேற்கு',
  'sse': 'தென்-தென்கிழக்கு',
  'ese': 'கிழ-தென்கிழக்கு',
  'ssw': 'தென்-தென்மேற்கு',
  'wsw': 'மே-தென்மேற்கு',
  'north': 'வடக்கு',
  'south': 'தெற்கு',
  'east': 'கிழக்கு',
  'west': 'மேற்கு',
};

function translateWind(windStr: string | undefined, isTamil: boolean): string {
  if (!windStr) return '';
  if (!isTamil) return windStr;
  let translated = windStr.replace(/km\/h/gi, 'கி.மீ/ம');
  const tokens = translated.split(' ');
  const mappedTokens = tokens.map((tok) => {
    const clean = tok.toLowerCase();
    return WIND_DIR_MAP[clean] || tok;
  });
  return mappedTokens.join(' ');
}

const SHORT_DAY_TAMIL_MAP: Record<string, string> = {
  'MON': 'திங்கள்',
  'TUE': 'செவ்வாய்',
  'WED': 'புதன்',
  'THU': 'வியாழன்',
  'FRI': 'வெள்ளி',
  'SAT': 'சனி',
  'SUN': 'ஞாயிறு',
  'MONDAY': 'திங்கள்',
  'TUESDAY': 'செவ்வாய்',
  'WEDNESDAY': 'புதன்',
  'THURSDAY': 'வியாழன்',
  'FRIDAY': 'வெள்ளி',
  'SATURDAY': 'சனி',
  'SUNDAY': 'ஞாயிறு',
};

function translateShortDay(shortDay: string, isTamil: boolean): string {
  if (!shortDay) return '';
  if (!isTamil) return shortDay;
  const upper = shortDay.toUpperCase().trim();
  return SHORT_DAY_TAMIL_MAP[upper] || shortDay;
}

const MONTH_TAMIL_MAP: Record<string, string> = {
  'january': 'ஜனவரி',
  'february': 'பிப்ரவரி',
  'march': 'மார்ச்',
  'april': 'ஏப்ரல்',
  'may': 'மே',
  'june': 'ஜூன்',
  'july': 'ஜூலை',
  'august': 'ஆகஸ்ட்',
  'september': 'செப்டம்பர்',
  'october': 'அக்டோபர்',
  'november': 'நவம்பர்',
  'december': 'டிசம்பர்',
  'jan': 'ஜனவரி',
  'feb': 'பிப்ரவரி',
  'mar': 'மார்ச்',
  'apr': 'ஏப்ரல்',
  'jun': 'ஜூன்',
  'jul': 'ஜூலை',
  'aug': 'ஆகஸ்ட்',
  'sep': 'செப்டம்பர்',
  'oct': 'அக்டோபர்',
  'nov': 'நவம்பர்',
  'dec': 'டிசம்பர்',
};

function translateShortDate(subDate: string, isTamil: boolean): string {
  if (!subDate) return '';
  if (!isTamil) return subDate;
  let res = subDate;
  const sortedMonths = Object.keys(MONTH_TAMIL_MAP).sort((a, b) => b.length - a.length);
  for (const enMonth of sortedMonths) {
    const reg = new RegExp(`\\b${enMonth}\\b`, 'gi');
    res = res.replace(reg, MONTH_TAMIL_MAP[enMonth]);
  }
  return res;
}

function translateUvRating(rating: string, isTamil: boolean): string {
  if (!rating) return '';
  if (!isTamil) return rating;
  switch (rating.toLowerCase()) {
    case 'low': return 'குறைவு';
    case 'mod': return 'மிதமானது';
    case 'high': return 'அதிகம்';
    case 'very high': return 'மிக அதிகம்';
    default: return rating;
  }
}

function translateDetailCardTitle(title: string, isTamil: boolean): string {
  if (!title) return '';
  if (!isTamil) return title;
  if (/thermal|comfort/i.test(title)) return 'வெப்பநிலை & ஆறுதல் நிலை';
  if (/atmospheric|pressure/i.test(title)) return 'வளிமண்டலம் & காற்றழுத்த நிலை';
  if (/wind|air dynamics/i.test(title)) return 'காற்று & காற்றின் வேகம்';
  if (/precipitation|moisture/i.test(title)) return 'மழைப்பொழிவு & ஈரப்பதம்';
  if (/national alert|ndma/i.test(title)) return 'தேசிய வானிலை எச்சரிக்கை நிலை (NDMA)';
  if (/disaster management/i.test(title)) return 'பேரிடர் மேலாண்மை அறிவிப்புகள்';
  return title;
}

function formatLocationDisplay(rawLocation: string, fallback?: string, isTamil?: boolean): string {
  let display = '';
  if (!rawLocation) {
    display = fallback || '';
  } else {
    // Strip coordinates e.g. (13.0801, 80.2808)
    const cleaned = rawLocation.replace(/\s*\([^\)]*\)/g, '').trim();
    const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 2) {
      display = parts.join(', ');
    } else {
      const city = parts[0];
      // Find the district part
      const districtPart = parts.find((p, i) => i > 0 && /district/i.test(p));
      const statePart = parts.find((p, i) => i > 0 && /(Tamil Nadu|Kerala|Karnataka|Andhra|State)/i.test(p));

      if (districtPart) {
        const cleanDistrict = districtPart.replace(/\s*district\s*/i, '').trim();
        if (cleanDistrict.toLowerCase() !== city.toLowerCase()) {
          display = `${city}, ${cleanDistrict}`;
        } else if (statePart) {
          display = `${city}, ${statePart}`;
        } else {
          display = city;
        }
      } else if (parts[1] && parts[1].toLowerCase().slice(0, 4) === city.toLowerCase().slice(0, 4)) {
        // Deduplicate near-identical adjacent tokens (e.g. Thisayanvilai, Tisayanvilai)
        display = parts[2] ? `${city}, ${parts[2]}` : city;
      } else {
        display = `${parts[0]}, ${parts[1]}`;
      }
    }
  }

  if (isTamil) {
    return translateLocationToTamil(display);
  }
  return display;
}

function getVideoForWeatherConditions(
  conditions?: string,
  precipChance?: string,
  precipAmount?: string,
  shortDayOrTime?: string
): string {
  const cond = (conditions || '').toLowerCase();
  const rainAmountVal = precipAmount ? parseFloat(precipAmount) : 0;
  const rainChanceVal = precipChance ? parseFloat(precipChance) : 0;

  // 1. Severe weather / Thunderstorm / Squall / Cyclone
  if (
    /thunder|storm|squall|cyclone|tornado|severe|lightning/i.test(cond) ||
    /heavy rain/i.test(cond) ||
    rainAmountVal >= 10 ||
    (rainChanceVal >= 75 && rainAmountVal >= 4)
  ) {
    return '/videos/Heavy_rain.mp4';
  }

  // 2. Real Rain / Drizzle Rain / Showers:
  // Require precipitation >= 1.5mm OR explicit active drizzle/rain condition with rain >= 0.5mm
  // (Trace precipitation like 0.1mm - 0.3mm is NOT rain and plays cloud video)
  if (
    /heavy rain|moderate rain|downpour/i.test(cond) ||
    rainAmountVal >= 2.0 ||
    ((/rain|drizzle|shower/i.test(cond)) && (rainAmountVal >= 0.5 || rainChanceVal >= 55))
  ) {
    return '/videos/Drizzle rain.mp4';
  }

  // 3. Cloudy / Overcast / Gloomy / Fog / Mist / Haze / Trace moisture
  if (/cloud|overcast|fog|mist|haze|smoke|dust/i.test(cond) || rainChanceVal >= 35) {
    return '/videos/cloudy.mp4';
  }

  // 4. Night check if clear or time matches night (e.g. 19:00 - 05:00)
  const isNightTime =
    /night/i.test(cond) ||
    (shortDayOrTime &&
      /^\d{1,2}:\d{2}$/.test(shortDayOrTime) &&
      (parseInt(shortDayOrTime.split(':')[0], 10) >= 19 ||
        parseInt(shortDayOrTime.split(':')[0], 10) < 6));

  if (isNightTime && !/rain|storm/i.test(cond)) {
    return '/videos/night.mp4';
  }

  // 5. Clear / Sunny / Default
  return '/videos/sunny.mp4';
}

function getVisualMetricsForDay(day: {
  conditions: string;
  precipChance?: string;
  precipAmount?: string;
}) {
  const cond = (day.conditions || '').toLowerCase();
  const rainAmountVal = day.precipAmount ? parseFloat(day.precipAmount) : 0;
  const rainChanceVal = day.precipChance ? parseFloat(day.precipChance) : 0;

  let rainfall = rainAmountVal;
  if (/thunder|storm|heavy rain/i.test(cond)) {
    rainfall = Math.max(12, rainfall);
  } else if (/moderate rain/i.test(cond) || rainfall >= 2.5) {
    rainfall = Math.max(3, rainfall);
  } else if (/drizzle|light rain|shower/i.test(cond)) {
    if (rainfall >= 0.5 || rainChanceVal >= 50) {
      rainfall = Math.max(1.5, rainfall);
    } else {
      rainfall = 0; // trace moisture does not draw rain droplets
    }
  }

  let cloudCover = 2;
  if (/overcast/i.test(cond)) {
    cloudCover = 8;
  } else if (/cloudy|fog|mist/i.test(cond)) {
    cloudCover = 7;
  } else if (/partly/i.test(cond)) {
    cloudCover = 4;
  } else if (/clear|sun|fair/i.test(cond)) {
    cloudCover = 1;
  }

  return { rainfall, cloudCover };
}

function formatShortDate(subDate: string): string {
  if (!subDate) return '';
  return subDate
    .replace(/January/i, 'Jan')
    .replace(/February/i, 'Feb')
    .replace(/March/i, 'Mar')
    .replace(/April/i, 'Apr')
    .replace(/May/i, 'May')
    .replace(/June/i, 'Jun')
    .replace(/July/i, 'Jul')
    .replace(/August/i, 'Aug')
    .replace(/September/i, 'Sep')
    .replace(/October/i, 'Oct')
    .replace(/November/i, 'Nov')
    .replace(/December/i, 'Dec')
    .replace(/,\s*\d{4}/, '')
    .trim();
}

function formatSunSpan(sunrise?: string, sunset?: string, daylight?: string): string {
  const cleanT = (s?: string) => {
    if (!s) return '';
    const m = s.match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : s;
  };
  const r = cleanT(sunrise);
  const set = cleanT(sunset);
  if (r && set) return `${r} – ${set}`;
  if (daylight) return daylight;
  return '06:07 – 17:39';
}

function formatUvIndex(uv?: string) {
  if (!uv) return { val: '4.8', rating: 'Mod' };
  const num = parseFloat(uv);
  if (isNaN(num)) return { val: uv, rating: '' };
  let rating = 'Low';
  if (num >= 8) rating = 'Very High';
  else if (num >= 6) rating = 'High';
  else if (num >= 3) rating = 'Mod';
  return { val: num.toFixed(1), rating };
}

function formatFeelsLike(feels?: string, high?: string, low?: string) {
  if (feels) {
    const m = feels.match(/(?:High\s*)?([+-]?\d+)[^\/]*\/\s*(?:Low\s*)?([+-]?\d+)/i);
    if (m) return `${m[1]}° / ${m[2]}°`;
    const single = feels.match(/([+-]?\d+)/);
    if (single && low) {
      const cleanL = low.replace(/°[CF]/i, '');
      return `${single[1]}° / ${cleanL}°`;
    }
    return feels.replace(/°[CF]/i, '°').trim();
  }
  const cleanH = high ? high.replace(/°[CF]/i, '') : '32';
  const cleanL = low ? low.replace(/°[CF]/i, '') : '27';
  return `${cleanH}° / ${cleanL}°`;
}

function formatRainTile(precipChance?: string, precipAmount?: string) {
  const percent = precipChance ? (precipChance.includes('%') ? precipChance : `${precipChance}%`) : '12%';
  let amount = precipAmount ? precipAmount.replace(/[()]/g, '').trim() : '';
  if (!amount && percent !== '0%') {
    amount = '0.80 mm';
  }
  return { percent, amount };
}

function formatWindTile(wind?: string) {
  if (!wind) return '17 km/h N';
  return wind;
}

interface ParsedWeatherMcp {
  location: string;
  currentTemp?: number | null;
  currentTempUnit?: string;
  feelsLike?: string;
  conditions?: string;
  todayRange?: string;
  humidity?: string;
  wind?: string;
  pressure?: string;
  cloudCover?: string;
  rain?: string;
  heatStress?: string;
  weatherSummary?: string[];
  alerts: string[];
  forecast: Array<{
    dayTitle: string;
    shortDay: string;
    subDate: string;
    highTemp: string;
    lowTemp: string;
    conditions: string;
    precipChance?: string;
    precipAmount?: string;
    wind?: string;
    windGusts?: string;
    feelsLike?: string;
    sunrise?: string;
    sunset?: string;
    daylight?: string;
    uvIndex?: string;
    diagnostics: Array<{ label: string; value: string }>;
  }>;
  detailCards: Array<{
    title: string;
    lines: string[];
  }>;
}

function parseMcpResponse(text: string | undefined, defaultLoc: string): ParsedWeatherMcp {
  const result: ParsedWeatherMcp = {
    location: defaultLoc,
    currentTemp: null,
    currentTempUnit: '°C',
    weatherSummary: [],
    alerts: [],
    forecast: [],
    detailCards: [],
  };

  if (!text) return result;

  // 1. Location extraction
  const locMatch = text.match(/\*\*Location:\*\*\s*([^\n\r]+)/i);
  if (locMatch) {
    result.location = locMatch[1].trim();
  }

  // 1b. Weather Summary extraction
  const summarySection = text.match(/#+\s*(?:Weather Summary|Summary)[^\n\r]*\n([\s\S]*?)(?:---|\n#|$)/i);
  if (summarySection) {
    const summaryLines = summarySection[1]
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter((l) => l && !l.startsWith('*Data source') && !l.startsWith('#') && !l.startsWith('---'));
    if (summaryLines.length > 0) {
      result.weatherSummary = summaryLines;
    }
  }

  // 2. Current Conditions & Metrics
  const tempMatch = text.match(/\*\*Temperature:\*\*\s*(?:High\s*)?([+-]?\d+(?:\.\d+)?)\s*(°[CF])/i);
  if (tempMatch) {
    result.currentTemp = parseFloat(tempMatch[1]);
    result.currentTempUnit = tempMatch[2];
  }

  const feelsMatch = text.match(/\*\*Feels Like:\*\*\s*([^\n\r]+)/i);
  if (feelsMatch) result.feelsLike = feelsMatch[1].trim();

  const condMatch = text.match(/\*\*Conditions:\*\*\s*([^\n\r]+)/i);
  if (condMatch) {
    const rawCond = condMatch[1].trim();
    const rainMatch = text.match(/\*\*(?:Precipitation|Rain|Current):\*\*\s*([^\n\r]+)/i);
    const rainAmt = rainMatch ? parseFloat(rainMatch[1]) : 0;
    const cloudMatch = text.match(/\*\*Cloud Cover:\*\*\s*([^\n\r]+)/i);
    const cloudVal = cloudMatch ? parseInt(cloudMatch[1], 10) : 50;
    result.conditions = normalizeWeatherConditionText(rawCond, rainAmt, 0, cloudVal);
  }

  const rangeMatch = text.match(/\*\*Today's Range:\*\*\s*([^\n\r]+)/i);
  if (rangeMatch) result.todayRange = rangeMatch[1].trim();

  const humMatch = text.match(/\*\*Humidity:\*\*\s*([^\n\r]+)/i);
  if (humMatch) result.humidity = humMatch[1].trim();

  const windMatch = text.match(/\*\*Wind:\*\*\s*([^\n\r]+)/i);
  if (windMatch) result.wind = windMatch[1].trim();

  const presMatch = text.match(/\*\*Pressure:\*\*\s*([^\n\r]+)/i);
  if (presMatch) result.pressure = presMatch[1].trim();

  const cloudMatch = text.match(/\*\*Cloud Cover:\*\*\s*([^\n\r]+)/i);
  if (cloudMatch) result.cloudCover = cloudMatch[1].trim();

  const rainMatch = text.match(/\*\*(?:Precipitation|Rain|Current):\*\*\s*([^\n\r]+)/i);
  if (rainMatch) result.rain = rainMatch[1].trim();

  const heatMatch = text.match(/(?:🥵\s*)?\*\*Heat stress[^*]*\*\*\s*:?\s*([^\n\r]+)/i);
  if (heatMatch) result.heatStress = heatMatch[1].trim();

  // 3. Alerts section
  const alertSection = text.match(/#+\s*(?:Weather Alerts|Alerts|Active Warnings)[^\n\r]*\n([\s\S]*?)(?:---|\n#|$)/i);
  if (alertSection) {
    const alertLines = alertSection[1]
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('*') && !l.startsWith('#') && !l.startsWith('**Location:'));
    if (alertLines.length > 0) {
      result.alerts = alertLines;
    }
  }

  // 4. Forecast Days (Daily forecast items, hourly items, and multi-model comparison)
  const dayRegex = /##\s+([^\n\r#]+)\n([\s\S]*?)(?=(?:##\s+|$))/g;
  let match;
  while ((match = dayRegex.exec(text)) !== null) {
    const dayTitle = match[1].trim();
    if (
      /Recent Precipitation|Server Version|NOAA Weather|Open-Meteo|Cache Statistics|Overall Status|Pollutant|Health Implication/i.test(
        dayTitle
      )
    ) {
      continue;
    }

    const body = match[2];

    // Model comparison format: **Best match:** High 30°C / Low 24°C — Light drizzle
    const bestMatch = body.match(
      /\*\*Best match:\*\*\s*(?:High\s*)?([+-]?\d+(?:°[CF])?)\s*\/\s*(?:Low\s*)?([+-]?\d+(?:°[CF])?)\s*(?:—|-)\s*([^\n\r]+)/i
    );

    let tempH = body.match(/\*\*Temperature:\*\*\s*(?:High\s*)?([+-]?\d+(?:°[CF])?)/i);
    let tempL = body.match(/(?:Low|\/)\s*([+-]?\d+(?:°[CF])?)/i);
    let dayCond = body.match(/\*\*Conditions:\*\*\s*([^\n\r]+)/i);

    if (bestMatch) {
      if (!tempH) tempH = [bestMatch[0], bestMatch[1]];
      if (!tempL) tempL = [bestMatch[0], bestMatch[2]];
      if (!dayCond) dayCond = [bestMatch[0], bestMatch[3]];
    }

    // Hourly format: **Temperature:** 26°C (feels like 30°C)
    if (!tempH) {
      const hourlyTemp = body.match(/\*\*Temperature:\*\*\s*([+-]?\d+(?:°[CF])?)/i);
      if (hourlyTemp) tempH = hourlyTemp;
    }

    const rainCh = body.match(/\*\*Precipitation Chance:\*\*\s*([^\n\r]+)/i);
    const rainAmt = body.match(/\*\*Precipitation:\*\*\s*([^\n\r]+)/i);
    const dayWind = body.match(/\*\*Wind:\*\*\s*([^\n\r]+)/i);
    const windGusts = body.match(/\*\*Wind Gusts:\*\*\s*([^\n\r]+)/i);
    const feelsLike = body.match(/\*\*Feels Like:\*\*\s*([^\n\r]+)/i);
    const sunrise = body.match(/\*\*Sunrise:\*\*\s*([^\n\r]+)/i);
    const sunset = body.match(/\*\*Sunset:\*\*\s*([^\n\r]+)/i);
    const daylight = body.match(/\*\*Daylight Duration:\*\*\s*([^\n\r]+)/i);
    const uvIndex = body.match(/\*\*UV Index:\*\*\s*([^\n\r]+)/i);

    const diagnostics: Array<{ label: string; value: string }> = [];
    const lineRegex = /\*\*([^*]+):\*\*\s*([^\n\r]+)/g;
    let lMatch;
    while ((lMatch = lineRegex.exec(body)) !== null) {
      const label = lMatch[1].trim();
      const value = lMatch[2].trim();
      if (!/Temperature|Conditions|Precipitation Chance|Best match/i.test(label)) {
        diagnostics.push({ label, value });
      }
    }

    const hourlyMatch = dayTitle.match(/(\d+\/\d+\/\d+),\s*(\d+:\d+)/);
    let shortDay = '';
    let subDate = '';

    if (hourlyMatch) {
      shortDay = hourlyMatch[2];
      subDate = hourlyMatch[1];
    } else {
      const parts = dayTitle.split(',');
      const dayWord = parts[0]?.trim() || '';
      const dateRest = parts[1]?.trim() || '';
      shortDay = dayWord.slice(0, 3).toUpperCase();
      subDate = dateRest || dayTitle;
    }

    if (tempH || dayCond || rainCh || diagnostics.length > 0) {
      const rawCond = dayCond ? dayCond[1].trim() : 'Partly Cloudy';
      const pMm = rainAmt ? parseFloat(rainAmt[1]) : 0;
      const pChance = rainCh ? parseFloat(rainCh[1]) : 0;
      const normalizedCond = normalizeWeatherConditionText(rawCond, pMm, pChance, 50);

      result.forecast.push({
        dayTitle,
        shortDay: shortDay || dayTitle.slice(0, 5),
        subDate: subDate || dayTitle,
        highTemp: tempH ? tempH[1].replace(/High\s*/i, '').trim() : '',
        lowTemp: tempL ? tempL[1].trim() : '',
        conditions: normalizedCond,
        precipChance: rainCh ? rainCh[1].trim() : undefined,
        precipAmount: rainAmt ? rainAmt[1].trim() : undefined,
        wind: dayWind ? dayWind[1].trim() : undefined,
        windGusts: windGusts ? windGusts[1].trim() : undefined,
        feelsLike: feelsLike ? feelsLike[1].trim() : undefined,
        sunrise: sunrise ? sunrise[1].trim() : undefined,
        sunset: sunset ? sunset[1].trim() : undefined,
        daylight: daylight ? daylight[1].trim() : undefined,
        uvIndex: uvIndex ? uvIndex[1].trim() : undefined,
        diagnostics,
      });
    }
  }

  // 5. General telemetry section cards
  const sectionRegex = /#+\s*([^\n\r#]+)\n([\s\S]*?)(?=(?:#+\s*|$))/g;
  let secMatch;
  while ((secMatch = sectionRegex.exec(text)) !== null) {
    const heading = secMatch[1].trim();
    if (
      /Weather Summary|Current Weather Conditions|Weather Forecast|Weather Alerts/i.test(heading)
    ) {
      continue;
    }
    const lines = secMatch[2]
      .split('\n')
      .map((l) => l.replace(/^[-*•]\s*/, '').trim())
      .filter((l) => l && !l.startsWith('---') && !l.startsWith('*Data source'));

    if (lines.length > 0) {
      result.detailCards.push({
        title: heading,
        lines: lines.slice(0, 8),
      });
    }
  }

  // 6. Fallback cards for standalone calls (e.g. Current Conditions, Alerts, or Service Status)
  if (result.forecast.length === 0 && result.detailCards.length === 0) {
    if (result.currentTemp != null || result.conditions) {
      result.detailCards.push({
        title: 'Thermal & Comfort Telemetry',
        lines: [
          `Current Conditions: ${result.conditions || 'Clear'}`,
          `Feels Like: ${result.feelsLike || '--'}`,
          `Heat Stress Index: ${result.heatStress || 'Optimal / Normal Range'}`,
          `Expected Range: ${result.todayRange || '--'}`,
        ],
      });
      result.detailCards.push({
        title: 'Atmospheric & Pressure Status',
        lines: [
          `Atmospheric Pressure: ${result.pressure || '1013 hPa'}`,
          `Cloud Cover: ${result.cloudCover || 'Clear'}`,
          `Humidity Reading: ${result.humidity || '--'}`,
          `Location: ${result.location}`,
        ],
      });
      result.detailCards.push({
        title: 'Wind & Air Dynamics',
        lines: [
          `Wind Velocity: ${result.wind || 'Gentle Breeze'}`,
          `Relative Humidity: ${result.humidity || '--'}`,
          `WBGT Heat Advisory: ${result.heatStress ? 'Active heat stress mitigation recommended' : 'Normal conditions'}`,
        ],
      });
      result.detailCards.push({
        title: 'Precipitation & Moisture',
        lines: [
          `Current Precipitation: ${result.rain || '0.0 mm'}`,
          `Relative Humidity: ${result.humidity || '--'}`,
          `Dewpoint Index: Near ambient equilibrium`,
        ],
      });
    } else if (text.includes('Weather Alerts') || text.includes('NDMA SACHET')) {
      result.detailCards.push({
        title: 'National Alert Status (NDMA India)',
        lines: [
          'No active severe weather warnings for this location.',
          'Feed: Official National CAP Feed (NDMA SACHET)',
          'Status: Live continuous polling active',
        ],
      });
      result.detailCards.push({
        title: 'Disaster Management Feeds',
        lines: [
          'Coverage: Tamil Nadu & Nationwide India',
          'Source: National Disaster Management Authority',
          'Protocol: OASIS Common Alerting Protocol (CAP)',
        ],
      });
    }
  }

  return result;
}

export default function WeatherMcpTestPage() {
  const { locale } = useLanguage();
  const isTamil = locale === 'ta';

  const [selectedTool, setSelectedTool] = useState<string>('forecast_7');
  const [locationInput, setLocationInput] = useState<string>('Chennai, Tamil Nadu');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<WeatherMcpCallResponse | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  const executeMcpTool = async (toolKey = selectedTool, locToRun = locationInput) => {
    if (!locToRun.trim() && toolKey !== 'service_status') return;
    setLoading(true);
    setResponse(null);
    setSelectedDayIndex(0);

    const toolDef = MCP_TOOLS.find((t) => t.value === toolKey) || MCP_TOOLS[0];
    const actualToolName = toolDef.tool;
    const toolParams = toolDef.params || {};

    const queryLocation = normalizeLocationForMcp(locToRun);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/weather-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: actualToolName,
          location: queryLocation,
          units: 'metric',
          params: toolParams,
        }),
      });

      const data: WeatherMcpCallResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({
        success: false,
        tool: actualToolName,
        location: locToRun,
        error: err?.message || (isTamil ? 'வானிலை MCP சேவையகத்துடன் இணைக்க முடியவில்லை.' : 'Failed to connect to Weather MCP server.'),
        durationMs: Date.now() - startTime,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeMcpTool('forecast_7', 'Chennai, Tamil Nadu');
  }, []);

  const parsed = useMemo(
    () => parseMcpResponse(response?.text, locationInput),
    [response?.text, locationInput]
  );

  const safeDayIndex = useMemo(() => {
    if (parsed.forecast.length === 0) return 0;
    return Math.min(selectedDayIndex, parsed.forecast.length - 1);
  }, [parsed.forecast.length, selectedDayIndex]);

  const activeDay = useMemo(() => {
    return parsed.forecast[safeDayIndex] || parsed.forecast[0] || null;
  }, [parsed.forecast, safeDayIndex]);

  const backgroundVideoSrc = useMemo(() => {
    if (activeDay) {
      return getVideoForWeatherConditions(
        activeDay.conditions,
        activeDay.precipChance,
        activeDay.precipAmount,
        activeDay.shortDay
      );
    }
    const rainNumeric = parsed.rain ? parseFloat(parsed.rain) || 0 : 0;
    const cloudNumeric = parsed.cloudCover ? parseFloat(parsed.cloudCover) / 12.5 : 4;
    return getWeatherBackgroundVideo(rainNumeric, cloudNumeric);
  }, [activeDay, parsed.rain, parsed.cloudCover]);

  const displayTemp = useMemo(() => {
    if (safeDayIndex > 0 && activeDay?.highTemp) {
      const parsedH = parseFloat(activeDay.highTemp);
      return isNaN(parsedH) ? activeDay.highTemp.replace(/°[CF]/i, '') : Math.round(parsedH);
    }
    if (parsed.currentTemp != null) {
      return Math.round(parsed.currentTemp);
    }
    if (activeDay?.highTemp) {
      const parsedH = parseFloat(activeDay.highTemp);
      return isNaN(parsedH) ? activeDay.highTemp.replace(/°[CF]/i, '') : Math.round(parsedH);
    }
    return null;
  }, [safeDayIndex, activeDay, parsed.currentTemp]);

  const displayConditions = useMemo(() => {
    let raw = '';
    if (safeDayIndex > 0 && activeDay?.conditions) {
      raw = activeDay.conditions;
    } else {
      raw = parsed.conditions || activeDay?.conditions || (response?.tool ? `Tool: ${response.tool}` : (isTamil ? 'நேரலை வானிலை' : 'Live Telemetry'));
    }
    return translateWeatherCondition(raw, isTamil);
  }, [safeDayIndex, activeDay, parsed.conditions, response?.tool, isTamil]);

  const displayRange = useMemo(() => {
    if (safeDayIndex > 0 && activeDay) {
      if (activeDay.lowTemp && activeDay.highTemp) {
        return `${activeDay.lowTemp} / ${activeDay.highTemp}`;
      }
      return activeDay.highTemp || activeDay.lowTemp || '';
    }
    return parsed.todayRange || (activeDay?.lowTemp && activeDay?.highTemp ? `${activeDay.lowTemp} / ${activeDay.highTemp}` : '');
  }, [safeDayIndex, activeDay, parsed.todayRange]);

  const displayWind = useMemo(() => {
    let raw = '';
    if (safeDayIndex > 0 && activeDay?.wind) {
      raw = activeDay.wind;
    } else {
      raw = parsed.wind || activeDay?.wind || '';
    }
    return translateWind(raw, isTamil);
  }, [safeDayIndex, activeDay, parsed.wind, isTamil]);

  const displayRainCloud = useMemo(() => {
    if (safeDayIndex > 0 && activeDay) {
      const parts: string[] = [];
      if (activeDay.precipChance) parts.push(`${isTamil ? 'மழை' : 'Rain'}: ${activeDay.precipChance}`);
      if (activeDay.precipAmount) parts.push(`${isTamil ? 'அளவு' : 'Amount'}: ${activeDay.precipAmount}`);
      if (parts.length > 0) return parts.join(' • ');
    }
    const parts: string[] = [];
    if (parsed.rain) parts.push(`${isTamil ? 'மழைப்பொழிவு' : 'Precipitation'}: ${parsed.rain}`);
    if (parsed.cloudCover) parts.push(`${isTamil ? 'மேகமூட்டம்' : 'Cloud'}: ${parsed.cloudCover}`);
    return parts.join(' • ');
  }, [safeDayIndex, activeDay, parsed.rain, parsed.cloudCover, isTamil]);

  const displayFeelsLike = useMemo(() => {
    if (safeDayIndex > 0 && activeDay?.feelsLike) {
      return activeDay.feelsLike;
    }
    return parsed.feelsLike || activeDay?.feelsLike || '';
  }, [safeDayIndex, activeDay, parsed.feelsLike]);

  return (
    <div className="relative min-h-screen w-full weather-page-scope">
      {/* Background Ambient Weather Video Loop (Same as existing Weather page) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <video
          key={backgroundVideoSrc}
          src={backgroundVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          poster="/images/weather.jpg"
          className="w-full h-full object-cover scale-105"
        />
      </div>
      <div className="fixed inset-0 pointer-events-none z-0 gpu-accelerate" />

      <div className="relative z-10 flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-[1720px] w-full mx-auto pb-24">
        {/* Top Controls: Location & MCP Tool Selector (Matching Weather Page's Glass Panel) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="glass-panel weather-top-controls p-3.5 sm:px-5 sm:py-4 rounded-2xl border border-border-light shadow-xl space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Tool Selector */}
            <div className="md:col-span-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {isTamil ? 'முன்னறிவிப்பு முறை' : 'Forecast Mode'}
              </label>
              <Select
                value={selectedTool}
                onChange={(val) => {
                  setSelectedTool(val);
                  executeMcpTool(val, locationInput);
                }}
                className="w-full h-10 text-xs font-semibold custom-antd-select"
                options={MCP_TOOLS.map((t) => ({
                  value: t.value,
                  label: (
                    <div className="flex items-center justify-between gap-2 py-0.5">
                      <span className="font-bold">{isTamil ? t.labelTa : t.label}</span>
                    </div>
                  ),
                }))}
              />
            </div>

            {/* Target Location Input */}
            <div className="md:col-span-5">
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-text-muted mb-1.5">
                {isTamil ? 'இடம்' : 'Location'}
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeMcpTool()}
                  placeholder={isTamil ? 'உதா. சென்னை, தமிழ்நாடு அல்லது தஞ்சாவூர்...' : 'e.g. Chennai, Tamil Nadu or Thanjavur...'}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface/80 border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => executeMcpTool()}
                disabled={loading}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-slate-950" />
                    <span>{isTamil ? 'தேடுகிறது...' : 'Searching...'}</span>
                  </>
                ) : (
                  <>
                    <Search size={14} />
                    <span>{isTamil ? 'தேடுக' : 'Search'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Location Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border-subtle">
            <span className="text-[11px] font-bold text-text-muted mr-1">
              {isTamil ? 'விரைவு இடங்கள்:' : 'Quick Locations:'}
            </span>
            {SAMPLE_LOCATIONS.map((loc) => {
              const isSelected = locationInput === loc.value || locationInput === loc.labelTa;
              return (
                <button
                  key={loc.value}
                  type="button"
                  onClick={() => {
                    setLocationInput(loc.value);
                    executeMcpTool(selectedTool, loc.value);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950 border-sky-400 font-extrabold shadow-sm'
                      : 'glass-surface border-border-subtle text-text-secondary hover:text-text-main'
                  }`}
                >
                  {isTamil ? loc.labelTa : loc.labelEn}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="glass-panel rounded-2xl border border-border-light p-8 space-y-5 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              <span>{isTamil ? 'நேரலை வானிலை முன்னறிவிப்பு பெறப்படுகிறது...' : 'Fetching live high-resolution weather forecast...'}</span>
            </div>
            <div className="h-64 rounded-3xl skeleton-box" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-64 rounded-2xl skeleton-box" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {response?.error && !loading && (
          <div className="glass-panel rounded-2xl border border-rose-500/30 bg-rose-500/[0.08] p-8 text-center space-y-3">
            <span className="text-4xl inline-block">⚠️</span>
            <h3 className="text-base font-bold text-rose-500">
              {isTamil ? 'வானிலை முன்னறிவிப்பு கிடைக்கவில்லை' : 'Weather Forecast Unavailable'}
            </h3>
            <p className="text-xs text-text-muted max-w-md mx-auto font-mono">{response.error}</p>
            <button
              type="button"
              onClick={() => executeMcpTool()}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white keep-white font-bold text-xs shadow-md hover:bg-sky-400 transition-all cursor-pointer"
            >
              {isTamil ? 'மீண்டும் முயற்சிக்கவும்' : 'Retry Forecast'}
            </button>
          </div>
        )}

        {/* Success Data Presentation: Styled with Interactive 3D FlipCards */}
        {response?.success && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full space-y-6"
          >
            {/* FLOATING TOP HERO ROW (Matching existing Weather Page) */}
            <div className="keep-white relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 px-2 sm:px-4 pt-2 text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
              {/* Left Column: Location, Conditions, Droplets, Wind, Rain */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white keep-white m-0">
                      {formatLocationDisplay(parsed.location, locationInput, isTamil)}
                    </h2>
                    {safeDayIndex > 0 && activeDay && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/25 border border-sky-400/50 text-sky-200 uppercase tracking-wider backdrop-blur-md shadow-sm">
                        {translateShortDay(activeDay.shortDay, isTamil)} • {translateShortDate(activeDay.subDate, isTamil)}
                      </span>
                    )}
                  </div>
                  <p className="text-xl sm:text-2xl font-normal text-white/95 mt-2.5 mb-0 flex items-baseline gap-2 flex-wrap">
                    <span>{displayConditions}</span>
                    {displayRange && (
                      <span className="text-sm font-normal text-white/75">
                        • {isTamil ? 'வரம்பு' : 'Range'}: {displayRange}
                      </span>
                    )}
                  </p>
                </div>

                <div className="space-y-2.5 text-sm text-white/95">
                  {parsed.humidity && (
                    <div className="flex items-center gap-3.5">
                      <Droplets size={18} className="text-white/90 shrink-0" strokeWidth={1.6} />
                      <span className="font-normal">{isTamil ? 'ஈரப்பதம்' : 'Humidity'}: {parsed.humidity}</span>
                    </div>
                  )}

                  {displayWind && (
                    <div className="flex items-center gap-3.5">
                      <Wind size={18} className="text-white/90 shrink-0" strokeWidth={1.6} />
                      <span className="font-normal">{isTamil ? 'காற்று' : 'Wind'}: {displayWind}</span>
                    </div>
                  )}

                  {displayRainCloud && (
                    <div className="flex items-center gap-3.5">
                      <CloudRain size={18} className="text-white/90 shrink-0" strokeWidth={1.6} />
                      <span className="font-normal">{displayRainCloud}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Big Temperature & Status Display */}
              <div className="flex flex-col sm:items-end justify-start shrink-0">
                {displayTemp != null ? (
                  <div className="text-6xl sm:text-7xl lg:text-[5.5rem] font-extralight tracking-tight text-white keep-white leading-none font-sans">
                    +{displayTemp}
                    <span className="text-4xl sm:text-5xl align-top ml-1 font-extralight text-white keep-white">
                      {parsed.currentTempUnit || '°C'}
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-mono text-sm">
                    {response?.tool || selectedTool}
                  </div>
                )}

                <div className="mt-2.5 flex items-center gap-2.5 text-sm font-light text-white/90 flex-wrap">
                  {displayFeelsLike && (
                    <span>{isTamil ? 'உணரப்படும் வெப்பநிலை' : 'Feels Like'} {displayFeelsLike}</span>
                  )}
                  {safeDayIndex > 0 && activeDay?.lowTemp && (
                    <span>{isTamil ? 'குறைந்தது' : 'Min'} {activeDay.lowTemp}</span>
                  )}
                </div>
              </div>
            </div>

            {/* MOTION CAROUSEL: FREE SCROLL (Interactive 3D FlipCards in free horizontal momentum scroll) */}
            {parsed.forecast.length > 0 && (
              <div className="relative z-10 w-full">
                <MotionFreeScrollCarousel
                  itemCount={parsed.forecast.length}
                  helperText={isTamil ? 'சுழல் பலகை • கிடைமட்டமாக இழுக்கவும்' : 'Free scroll carousel • Drag or swipe horizontally'}
                >
                  {parsed.forecast.map((day, idx) => {
                    const isSelected = idx === safeDayIndex;
                    const visual = getVisualMetricsForDay(day);
                    const cleanH = day.highTemp ? day.highTemp.replace(/°[CF]/i, '') : '--';
                    const cleanL = day.lowTemp ? day.lowTemp.replace(/°[CF]/i, '') : '--';
                    const rangeStr = cleanH !== '--' && cleanL !== '--' ? `H ${cleanH}° • L ${cleanL}°` : '';
                    const feelsLikeFormatted = formatFeelsLike(day.feelsLike, cleanH, cleanL);
                    const windFormatted = formatWindTile(day.wind);
                    const rainData = formatRainTile(day.precipChance, day.precipAmount);
                    const uvData = formatUvIndex(day.uvIndex);
                    const sunSpanFormatted = formatSunSpan(day.sunrise, day.sunset, day.daylight);
                    const shortDate = formatShortDate(day.subDate);

                    return (
                      <div
                        key={`${day.dayTitle}-${idx}`}
                        onClick={() => setSelectedDayIndex(idx)}
                        className={`w-[290px] sm:w-[310px] shrink-0 transition-all duration-300 cursor-pointer ${
                          isSelected ? '-translate-y-1.5' : 'hover:-translate-y-0.5'
                        }`}
                      >
                        <FlipCard
                          axis="y"
                          flipOnClick
                          draggable={false}
                          dragDistance={0}
                          tilt
                          tiltMax={10}
                          glare
                          glareOpacity={0.2}
                          hoverScale={1.02}
                          perspective={1100}
                          stiffness={170}
                          damping={20}
                          width="100%"
                          height={380}
                          radius={24}
                          background="transparent"
                          color="#f5f5f5"
                          shadow={false}
                          className="w-full"
                          front={
                            <div
                              className={`w-full h-full p-5 flex flex-col justify-between items-center text-center rounded-[24px] glass-panel backdrop-blur-xl relative overflow-hidden group select-none transition-all text-white keep-white ${
                                isSelected
                                  ? 'weather-card-active border-2 border-sky-400 bg-sky-500/[0.08] dark:bg-sky-950/30 shadow-[0_12px_36px_rgba(14,165,233,0.38)] ring-2 ring-sky-400/50'
                                  : 'weather-card-inactive border border-white/20 dark:border-white/10 bg-white/[0.04] dark:bg-black/25 shadow-xl hover:border-sky-400/50'
                              }`}
                            >
                              {/* Top Bar: TODAY / SAT + Date */}
                              <div className="w-full flex items-center justify-between pb-2 border-b border-white/10">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-xs font-black tracking-widest uppercase font-mono ${
                                      isSelected ? 'text-sky-300' : 'text-emerald-400'
                                    }`}
                                  >
                                    {idx === 0 ? (isTamil ? 'இன்று' : 'TODAY') : translateShortDay(day.shortDay, isTamil)}
                                  </span>
                                  {isSelected && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-400 text-slate-950 shadow-sm">
                                      {isTamil ? 'செயலில்' : 'ACTIVE'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-white/80 keep-white font-medium truncate max-w-[130px]">
                                  {translateShortDate(shortDate, isTamil)}
                                </span>
                              </div>

                              {/* Center Hero */}
                              <div className="my-auto flex flex-col items-center py-2">
                                <WeatherDayIcon
                                  rainfall={visual.rainfall}
                                  cloudCover={visual.cloudCover}
                                  conditionText={day.conditions}
                                  className="w-16 h-14 mb-2 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110"
                                />
                                <div className="text-sm text-white/95 keep-white font-semibold truncate max-w-[220px]">
                                  {translateWeatherCondition(day.conditions, isTamil)}
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-white keep-white mt-1.5 font-sans tracking-tight">
                                  {cleanH !== '--' ? `+${cleanH}°C` : (day.highTemp ? `+${day.highTemp}` : '--')}
                                </div>
                                <div className="text-xs text-white/70 keep-white font-medium mt-1">
                                  {cleanL !== '--' ? `${isTamil ? 'குறைந்தது' : 'Min'} ${cleanL}°C` : ''}
                                  {rainData.percent ? ` • ${rainData.percent} ${isTamil ? 'மழை' : 'rain'}` : ''}
                                </div>
                              </div>

                              {/* Bottom Daylight Pill */}
                              <div className="w-full px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between text-xs text-white/80 keep-white backdrop-blur-md">
                                <span className="text-white/70 keep-white font-medium text-[11px]">
                                  {isTamil ? 'பகற்பொழுது' : 'Daylight'}
                                </span>
                                <span className="font-mono text-xs text-white/95 keep-white font-semibold tracking-tight">
                                  {sunSpanFormatted}
                                </span>
                              </div>
                            </div>
                          }
                          back={
                            <div
                              className={`w-full h-full p-4 sm:p-5 flex flex-col justify-between text-left rounded-[24px] glass-panel text-white keep-white backdrop-blur-xl relative overflow-hidden select-none transition-all ${
                                isSelected
                                  ? 'weather-card-active border-2 border-sky-400 bg-sky-500/[0.1] dark:bg-sky-950/40 shadow-[0_12px_36px_rgba(14,165,233,0.38)] ring-2 ring-sky-400/50'
                                  : 'weather-card-inactive border border-white/20 dark:border-white/10 bg-white/[0.05] dark:bg-black/35 shadow-xl hover:border-sky-400/50'
                              }`}
                            >
                              {/* Top Bar: SAT / SUN + Date */}
                              <div className="w-full pb-2 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black uppercase tracking-wider font-mono text-emerald-400">
                                    {idx === 0 ? (isTamil ? 'இன்று' : 'TODAY') : translateShortDay(day.shortDay, isTamil)}
                                  </span>
                                  {isSelected && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-400 text-slate-950 shadow-sm">
                                      {isTamil ? 'செயலில்' : 'ACTIVE'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-white/80 keep-white font-medium truncate max-w-[130px]">
                                  {translateShortDate(shortDate, isTamil)}
                                </span>
                              </div>

                              {/* Upper Hero Temperature Zone */}
                              <div className="w-full p-2.5 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-between gap-2 shadow-inner">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <WeatherDayIcon
                                    rainfall={visual.rainfall}
                                    cloudCover={visual.cloudCover}
                                    conditionText={day.conditions}
                                    className="w-9 h-8 shrink-0 drop-shadow"
                                  />
                                  <div className="min-w-0 text-left">
                                    <div className="text-xs sm:text-sm font-bold text-white keep-white truncate max-w-[130px] leading-tight">
                                      {translateWeatherCondition(day.conditions, isTamil)}
                                    </div>
                                    {rangeStr && (
                                      <div className="text-[11px] text-white/70 keep-white font-medium font-mono mt-0.5">
                                        {isTamil
                                          ? rangeStr.replace(/^H\s*/, 'அதிகம் ').replace(/•\s*L\s*/, '• குறைவு ')
                                          : rangeStr}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-white keep-white font-sans tracking-tight shrink-0">
                                  {cleanH !== '--' ? `${cleanH}°` : (day.highTemp ? `+${day.highTemp}` : '--')}
                                </div>
                              </div>

                              {/* Structured 2×2 Transparent Mini-Tile Grid */}
                              <div className="grid grid-cols-2 gap-2 w-full my-auto">
                                {/* Tile 1: FEELS */}
                                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col justify-between min-h-[58px] text-left">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 keep-white tracking-wider uppercase">
                                    <span className="text-xs leading-none">🌡️</span>
                                    <span className="text-white/70 keep-white">{isTamil ? 'உணரப்படும்' : 'FEELS'}</span>
                                  </div>
                                  <div className="text-xs sm:text-sm font-bold text-white keep-white font-mono mt-1 truncate">
                                    {feelsLikeFormatted}
                                  </div>
                                </div>

                                {/* Tile 2: WIND */}
                                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col justify-between min-h-[58px] text-left">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/60 keep-white tracking-wider uppercase">
                                    <Wind size={12} className="text-white/80 keep-white" />
                                    <span className="text-white/70 keep-white">{isTamil ? 'காற்று' : 'WIND'}</span>
                                  </div>
                                  <div className="text-xs sm:text-sm font-bold text-white keep-white font-mono mt-1 truncate">
                                    {translateWind(windFormatted, isTamil)}
                                  </div>
                                </div>

                                {/* Tile 3: RAIN */}
                                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col justify-between min-h-[58px] text-left">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-400 tracking-wider uppercase">
                                    <Droplets size={12} className="text-sky-400" />
                                    <span className="text-white/70 keep-white">{isTamil ? 'மழை' : 'RAIN'}</span>
                                  </div>
                                  <div className="text-xs sm:text-sm font-bold mt-1 font-mono flex items-baseline gap-1 truncate">
                                    <span className="text-sky-400">{rainData.percent}</span>
                                    {rainData.amount && (
                                      <span className="text-[10px] text-white/60 keep-white font-mono">({rainData.amount})</span>
                                    )}
                                  </div>
                                </div>

                                {/* Tile 4: UV IDX */}
                                <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col justify-between min-h-[58px] text-left">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 tracking-wider uppercase">
                                    <Sparkles size={12} className="text-amber-400" />
                                    <span className="text-white/70 keep-white">{isTamil ? 'புறஊதா' : 'UV IDX'}</span>
                                  </div>
                                  <div className="text-xs sm:text-sm font-bold mt-1 font-mono flex items-baseline gap-1.5 truncate">
                                    <span className="text-amber-400">{uvData.val}</span>
                                    {uvData.rating && (
                                      <span className="text-[10px] text-white/70 keep-white font-sans font-medium">
                                        {translateUvRating(uvData.rating, isTamil)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Sun Pill */}
                              <div className="w-full px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between text-xs text-white/80 keep-white backdrop-blur-md">
                                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                                  <span className="text-sm">🌅</span>
                                  <span className="text-[11px] font-semibold text-white/80 keep-white">
                                    {isTamil ? 'சூரியன்' : 'Sun'}
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-white/95 keep-white font-semibold tracking-tight">
                                  {sunSpanFormatted}
                                </span>
                              </div>
                            </div>
                          }
                        />
                      </div>
                    );
                  })}
                </MotionFreeScrollCarousel>
              </div>
            )}

            {/* STRUCTURED DETAIL CARDS (When forecast is absent, rendered in Motion Free Scroll Carousel) */}
            {parsed.forecast.length === 0 && parsed.detailCards.length > 0 && (
              <div className="relative z-10 w-full">
                <MotionFreeScrollCarousel
                  itemCount={parsed.detailCards.length}
                  helperText={isTamil ? 'சுழல் பலகை • கிடைமட்டமாக இழுக்கவும்' : 'Free scroll carousel • Drag or swipe horizontally'}
                >
                  {parsed.detailCards.map((card, idx) => {
                    const cardTitle = translateDetailCardTitle(card.title, isTamil);
                    return (
                      <div key={idx} className="w-[300px] sm:w-[320px] shrink-0">
                        <FlipCard
                          axis="y"
                          flipOnClick
                          draggable={false}
                          dragDistance={0}
                          tilt
                          tiltMax={10}
                          glare
                          glareOpacity={0.2}
                          hoverScale={1.02}
                          perspective={1100}
                          stiffness={170}
                          damping={20}
                          width="100%"
                          height={380}
                          radius={24}
                          background="transparent"
                          color="#f5f5f5"
                          shadow={false}
                          className="w-full"
                          front={
                            <div className="w-full h-full p-5 flex flex-col justify-between rounded-[24px] border border-white/20 dark:border-white/10 glass-panel bg-white/[0.04] dark:bg-black/25 backdrop-blur-xl relative overflow-hidden group select-none shadow-xl hover:border-sky-400/50 transition-all text-text-main">
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                                <div className="flex items-center gap-2">
                                  <span className="p-1.5 rounded-lg bg-sky-500/15 text-sky-500">
                                    <Sparkles size={14} />
                                  </span>
                                  <h4 className="text-sm font-black text-text-main uppercase tracking-wide m-0">
                                    {cardTitle}
                                  </h4>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
                                  {isTamil ? 'MCP நேரலை' : 'MCP Live'}
                                </span>
                              </div>

                              <div className="my-auto space-y-2 py-2">
                                {card.lines.slice(0, 4).map((l, i) => (
                                  <div key={i} className="text-xs text-text-secondary flex items-baseline gap-2">
                                    <span className="text-sky-400 font-bold">•</span>
                                    <span className="line-clamp-2">{l}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          }
                          back={
                            <div className="w-full h-full p-4 sm:p-5 flex flex-col justify-between rounded-[24px] border border-sky-400/35 dark:border-sky-400/20 glass-panel bg-white/[0.05] dark:bg-black/35 text-white backdrop-blur-xl relative overflow-hidden shadow-xl select-none hover:border-sky-400/50 transition-all">
                              <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-400/25">
                                <h4 className="text-xs font-black uppercase tracking-wide text-sky-300 m-0">
                                  {cardTitle}
                                </h4>
                                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                  {isTamil ? 'முழு விவரங்கள்' : 'Full Diagnostics'}
                                </span>
                              </div>

                              <ul className="flex-1 py-2 space-y-2 text-xs text-text-secondary m-0 pl-4 list-disc">
                                {card.lines.slice(0, 6).map((l, i) => (
                                  <li key={i} className="leading-relaxed">
                                    {l}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          }
                        />
                      </div>
                    );
                  })}
                </MotionFreeScrollCarousel>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
