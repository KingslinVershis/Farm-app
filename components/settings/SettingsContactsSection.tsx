'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Table, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'motion/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import ReflectiveCard from '@/components/reactbits/ReflectiveCard';
import { SpotlightCard } from '@/components/reactbits/SpotlightCard';
import { AnimatedCounter } from '@/components/reactbits/AnimatedCounter';
import {
  Mail,
  Phone,
  Search,
  X,
  User,
  ShieldCheck,
  Store,
  MapPin,
} from '@/components/icons/FlaticonIcons';
import type {
  OfficialCard,
  HeadquarterContact,
  DistrictBlockContact,
  ContactDataResponse,
  DistrictContactsApiResponse,
} from '@/app/api/contacts/route';

export const SettingsContactsSection: React.FC = () => {
  const { messages, locale } = useLanguage();
  const isTamil = locale === 'ta';
  const c = (messages as any).settingsContacts;

  // 1. Officials & Headquarters State
  const [officials, setOfficials] = useState<OfficialCard[]>([]);
  const [headquarters, setHeadquarters] = useState<HeadquarterContact[]>([]);
  const [loadingHq, setLoadingHq] = useState<boolean>(true);
  const [errorHq, setErrorHq] = useState<string | null>(null);
  const [hqSearch, setHqSearch] = useState<string>('');

  // 2. District & Block Contacts State (Server-side paginated & searched)
  const [districtContacts, setDistrictContacts] = useState<DistrictBlockContact[]>([]);
  const [districtTotal, setDistrictTotal] = useState<number>(0);
  const [districtPage, setDistrictPage] = useState<number>(1);
  const [districtPageSize, setDistrictPageSize] = useState<number>(10);
  const [districtSearch, setDistrictSearch] = useState<string>('');
  const [debouncedDistrictSearch, setDebouncedDistrictSearch] = useState<string>('');
  const [loadingDistrict, setLoadingDistrict] = useState<boolean>(true);

  // Debounce user search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDistrictSearch(districtSearch.trim());
      setDistrictPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [districtSearch]);

  // Fetch Officials & Headquarters
  const fetchOfficialsAndHq = useCallback(async () => {
    setLoadingHq(true);
    setErrorHq(null);
    try {
      const res = await fetch('/api/contacts');
      if (!res.ok) throw new Error(`Failed to load contact data (${res.status})`);
      const json: ContactDataResponse = await res.json();
      if (!json.success) throw new Error(json.error || 'Unable to parse contact details.');
      setOfficials(json.officials || []);
      setHeadquarters(json.headquarters || []);
    } catch (err: any) {
      console.error('[SettingsContacts] fetch error:', err);
      setErrorHq(err?.message || 'Unable to fetch official contacts.');
    } finally {
      setLoadingHq(false);
    }
  }, []);

  useEffect(() => {
    fetchOfficialsAndHq();
  }, [fetchOfficialsAndHq]);

  // Fetch District & Block Contacts (Server-side)
  const fetchDistrictContacts = useCallback(
    async (page: number, pageSize: number, search: string) => {
      setLoadingDistrict(true);
      try {
        const start = (page - 1) * pageSize;
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start,
            length: pageSize,
            search,
            draw: page,
          }),
        });
        if (!res.ok) throw new Error(`Failed to load district contacts (${res.status})`);
        const json: DistrictContactsApiResponse = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch district list.');
        setDistrictContacts(json.data || []);
        setDistrictTotal(json.recordsFiltered || json.recordsTotal || 0);
      } catch (err: any) {
        console.error('[SettingsContacts] district contacts error:', err);
      } finally {
        setLoadingDistrict(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDistrictContacts(districtPage, districtPageSize, debouncedDistrictSearch);
  }, [districtPage, districtPageSize, debouncedDistrictSearch, fetchDistrictContacts]);

  // Filtered Headquarters Table
  const filteredHeadquarters = useMemo(() => {
    const q = hqSearch.trim().toLowerCase();
    if (!q) return headquarters;
    return headquarters.filter(
      (h) =>
        h.headquarters.toLowerCase().includes(q) ||
        h.designation.toLowerCase().includes(q) ||
        h.name.toLowerCase().includes(q) ||
        h.email.toLowerCase().includes(q)
    );
  }, [headquarters, hqSearch]);

  // Headquarters Table Columns
  const hqColumns: ColumnsType<HeadquarterContact> = useMemo(
    () => [
      {
        title: c.colSlNo,
        dataIndex: 'slNo',
        key: 'slNo',
        width: '8%',
        align: 'center',
        render: (val: string) => <span className="font-mono text-xs text-text-muted">{val}</span>,
      },
      {
        title: c.colHq,
        dataIndex: 'headquarters',
        key: 'headquarters',
        width: '18%',
        render: (val: string) => (
          <span className="font-bold text-xs sm:text-sm text-text-main flex items-center gap-1.5">
            <Store size={13} className="text-emerald-500 shrink-0" />
            <span>{val}</span>
          </span>
        ),
      },
      {
        title: c.colDesignation,
        dataIndex: 'designation',
        key: 'designation',
        width: '28%',
        render: (val: string) => (
          <span className="font-semibold text-xs sm:text-sm text-emerald-600 dark:text-emerald-300">
            {val}
          </span>
        ),
      },
      {
        title: c.colName,
        dataIndex: 'name',
        key: 'name',
        width: '24%',
        render: (val: string) => (
          <span className="font-bold text-xs sm:text-sm text-text-main">{val}</span>
        ),
      },
      {
        title: c.colEmail,
        dataIndex: 'email',
        key: 'email',
        width: '22%',
        render: (val: string) =>
          val ? (
            <a
              href={`mailto:${val}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              <Mail size={12} />
              <span className="truncate max-w-[200px]">{val}</span>
            </a>
          ) : (
            <span className="text-xs text-text-muted">{c.noEmail}</span>
          ),
      },
    ],
    [c]
  );

  // District & Block Table Columns
  const districtColumns: ColumnsType<DistrictBlockContact> = useMemo(
    () => [
      {
        title: '#',
        key: 'index',
        width: '6%',
        align: 'center',
        render: (_, __, idx) => (
          <span className="font-mono text-xs text-text-muted">
            {(districtPage - 1) * districtPageSize + (idx ?? 0) + 1}
          </span>
        ),
      },
      {
        title: c.colDistrict,
        dataIndex: 'District_Name',
        key: 'District_Name',
        width: '16%',
        render: (val: string) => (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <MapPin size={11} />
            <span>{val}</span>
          </span>
        ),
      },
      {
        title: c.colHq,
        dataIndex: 'head',
        key: 'head',
        width: '16%',
        render: (val: string) => (
          <span className="font-bold text-xs text-text-main block">{val || '—'}</span>
        ),
      },
      {
        title: c.colBlock,
        dataIndex: 'Block_Name',
        key: 'Block_Name',
        width: '16%',
        render: (val: string | null) => (
          <span className="text-xs text-text-secondary font-medium block">
            {val ? val : <span className="text-text-muted text-[11px]">{c.noBlock}</span>}
          </span>
        ),
      },
      {
        title: c.colDesignation,
        dataIndex: 'design',
        key: 'design',
        width: '16%',
        render: (val: string) => (
          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-mono">
            {val || '—'}
          </span>
        ),
      },
      {
        title: c.colName,
        dataIndex: 'name',
        key: 'name',
        width: '18%',
        render: (val: string) => (
          <span className="font-extrabold text-xs text-text-main block">{val || '—'}</span>
        ),
      },
      {
        title: c.colEmail,
        dataIndex: 'email',
        key: 'email',
        width: '12%',
        render: (val: string) =>
          val ? (
            <a
              href={`mailto:${val}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
              title={val}
            >
              <Mail size={12} className="shrink-0" />
              <span className="truncate max-w-[150px]">{val}</span>
            </a>
          ) : (
            <span className="text-xs text-text-muted">{c.noEmail}</span>
          ),
      },
    ],
    [c, districtPage, districtPageSize]
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. GOVERNMENT OF TAMIL NADU OFFICIALS CARDS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={12} />
                {c.officialsTitle}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text-main tracking-tight">
              {c.officialsTitle}
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary">{c.officialsSubtitle}</p>
          </div>
        </div>

        {loadingHq ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton-box h-72 rounded-3xl" />
            ))}
          </div>
        ) : errorHq ? (
          <div className="glass-panel p-6 rounded-2xl border border-border-light text-center text-xs text-rose-500">
            {errorHq}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {officials.map((off) => (
              <ReflectiveCard key={off.id} tiltStrength={9} radius={24} intro>
                <div className="flex flex-col h-full justify-between items-center text-center p-2 gap-4">
                  {/* Photo or Initials Badge (Exact visual match to official TN Agrisnet card design) */}
                  <div className="relative mt-2">
                    {off.photoUrl ? (
                      <div className="w-24 h-24 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-emerald-500 to-cyan-400 shadow-xl shadow-emerald-500/20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={off.photoUrl}
                          alt={off.name}
                          className="w-full h-full object-cover rounded-full"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-800 text-white flex items-center justify-center font-black text-2xl tracking-wider shadow-xl shadow-emerald-950/40 border-2 border-emerald-400/40">
                        {off.initials}
                      </div>
                    )}
                  </div>

                  {/* Name & Designation */}
                  <div className="space-y-1.5 px-1 w-full">
                    <h3 className="text-base sm:text-lg font-black text-text-main leading-snug line-clamp-2">
                      {off.name}
                    </h3>
                    <p className="text-xs font-semibold text-text-secondary leading-relaxed line-clamp-3 min-h-[36px]">
                      {off.designation}
                    </p>
                  </div>

                  {/* Contact Action Pills */}
                  <div className="w-full pt-2 border-t border-border-subtle flex flex-col gap-2">
                    {off.email && (
                      <a
                        href={`mailto:${off.email}`}
                        className="w-full py-2 px-3 rounded-xl glass-surface border border-border-light hover:border-emerald-500/50 text-xs font-mono font-bold text-text-main hover:text-emerald-500 inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs truncate"
                      >
                        <Mail size={13} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{off.email}</span>
                      </a>
                    )}
                    {off.phone && (
                      <a
                        href={`tel:${off.phone}`}
                        className="w-full py-2 px-3 rounded-xl glass-surface border border-border-light hover:border-cyan-500/50 text-xs font-mono font-bold text-text-main hover:text-cyan-500 inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                      >
                        <Phone size={13} className="text-cyan-500 shrink-0" />
                        <span>{off.phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </ReflectiveCard>
            ))}
          </div>
        )}
      </section>

      {/* 2. HEAD QUARTERS TABLE */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-text-main tracking-tight">
              {c.headquartersTitle}
            </h2>
            <p className="text-xs text-text-secondary">{c.headquartersSubtitle}</p>
          </div>

          {/* Table Search Input */}
          <div className="relative w-full sm:w-72">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={hqSearch}
              onChange={(e) => setHqSearch(e.target.value)}
              placeholder={c.searchHqPlaceholder}
              className="w-full h-9 pl-9 pr-8 rounded-xl glass-surface border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-emerald-500"
            />
            {hqSearch && (
              <button
                type="button"
                onClick={() => setHqSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl">
          <div className="w-full overflow-x-auto scrollbar-thin">
            <Table<HeadquarterContact>
              columns={hqColumns}
              dataSource={filteredHeadquarters}
              rowKey={(rec, idx) => `hq-${rec.slNo}-${idx}`}
              pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] }}
              className="reservoirs-table"
              loading={loadingHq}
              locale={{ emptyText: c.noHqFound }}
            />
          </div>
        </div>
      </section>

      {/* 3. DISTRICT AND BLOCK CONTACTS TABLE */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                <MapPin size={12} />
                {districtTotal > 0 ? (
                  <span>
                    <AnimatedCounter value={districtTotal} /> {c.totalDistrictContacts}
                  </span>
                ) : (
                  c.totalDistrictContacts
                )}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-text-main tracking-tight">
              {c.districtContactsTitle}
            </h2>
            <p className="text-xs text-text-secondary">{c.districtContactsSubtitle}</p>
          </div>

          {/* District Contacts Search Input */}
          <div className="relative w-full lg:w-96">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              placeholder={c.searchPlaceholder}
              className="w-full h-10 pl-9 pr-8 rounded-xl glass-surface border border-border-light text-xs font-semibold text-text-main placeholder:text-text-muted focus:outline-none focus:border-cyan-500"
            />
            {districtSearch && (
              <button
                type="button"
                onClick={() => setDistrictSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl glass-panel border border-border-light shadow-xl">
          <div className="w-full overflow-x-auto scrollbar-thin">
            <Table<DistrictBlockContact>
              columns={districtColumns}
              dataSource={districtContacts}
              rowKey={(rec, idx) =>
                `dist-${rec.District_Name}-${rec.Block_Name}-${rec.name}-${(districtPage - 1) * districtPageSize + (idx ?? 0)}`
              }
              pagination={{
                current: districtPage,
                pageSize: districtPageSize,
                total: districtTotal,
                showSizeChanger: true,
                pageSizeOptions: ['10', '25', '50', '100'],
                onChange: (p, ps) => {
                  setDistrictPage(p);
                  setDistrictPageSize(ps);
                },
              }}
              className="reservoirs-table"
              loading={loadingDistrict}
              locale={{ emptyText: c.noDistrictFound }}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 border-t border-border-light bg-surface/40 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-emerald-500" />
              {c.sourceNote}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
