import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calculator,
  Check,
  Coins,
  ExternalLink,
  Percent,
  Sliders,
  TrendingDown,
  Users
} from 'lucide-react';
import {
  BorrowerShareConfig,
  LoanProviderBenchmark,
  PropertyListing,
  RoommateProfile
} from '../types/housing';
import { formatEUR, simulateGermanLoan } from '../utils/housingMath';

interface LoanCalculatorTabProps {
  listings: PropertyListing[];
  roommates: RoommateProfile[];
  loanProviders: LoanProviderBenchmark[];
  selectedPropertyId: string | null;
  onSelectPropertyId: (id: string | null) => void;
}

export const LoanCalculatorTab: React.FC<LoanCalculatorTabProps> = ({
  listings,
  roommates,
  loanProviders,
  selectedPropertyId,
  onSelectPropertyId
}) => {
  const buyableListings = useMemo(
    () => listings.filter((l) => l.mode !== 'rent'),
    [listings]
  );

  const selectedProperty = useMemo(
    () => buyableListings.find((l) => l.id === selectedPropertyId) ?? buyableListings[0] ?? null,
    [buyableListings, selectedPropertyId]
  );

  const [purchasePrice, setPurchasePrice] = useState<number>(
    selectedProperty?.basePriceOrColdRent ?? 765000
  );
  const [brokerFeePct, setBrokerFeePct] = useState<number>(
    selectedProperty?.brokerFeePct ?? 0
  );
  const [notaryPct, setNotaryPct] = useState<number>(2.0);
  const [renovationBudget, setRenovationBudget] = useState<number>(25000);
  const [monthlyHausgeld, setMonthlyHausgeld] = useState<number>(
    selectedProperty?.monthlyUtilitiesOrHausgeld ?? 480
  );
  const [erbpachtMonthly, setErbpachtMonthly] = useState<number>(
    selectedProperty?.erbpachtMonthly ?? 0
  );

  const [interestRatePct, setInterestRatePct] = useState<number>(3.65);
  const [initialTilgungPct, setInitialTilgungPct] = useState<number>(2.0);
  const [zinsbindungYears, setZinsbindungYears] = useState<number>(15);
  const [annualSondertilgung, setAnnualSondertilgung] = useState<number>(6000);

  const [direktkrediteAmount, setDirektkrediteAmount] = useState<number>(0);
  const [direktkrediteRatePct, setDirektkrediteRatePct] = useState<number>(1.5);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('interhyp-best');

  const [borrowerConfigs, setBorrowerConfigs] = useState<BorrowerShareConfig[]>(() =>
    roommates.map((rm) => ({
      roommateId: rm.id,
      isCoBorrower: rm.role === 'Working',
      equityContribution: rm.role === 'Working' ? Math.min(rm.availableEquity, 35000) : 0,
      loanSharePct: rm.role === 'Working' ? 20 : 0,
      internalRentIfNonBuyer: rm.role === 'Student' ? 450 : 0
    }))
  );

  // Sync property parameters when selectedProperty changes via Screener jump
  useEffect(() => {
    if (selectedProperty && selectedPropertyId) {
      setPurchasePrice(selectedProperty.basePriceOrColdRent);
      setBrokerFeePct(selectedProperty.brokerFeePct);
      setMonthlyHausgeld(selectedProperty.monthlyUtilitiesOrHausgeld);
      setErbpachtMonthly(selectedProperty.erbpachtMonthly ?? 0);
      setRenovationBudget(selectedProperty.energyClass === 'E' ? 75000 : 25000);
    }
  }, [selectedProperty, selectedPropertyId]);

  const totalEquity = useMemo(
    () => borrowerConfigs.reduce((sum, b) => sum + b.equityContribution, 0),
    [borrowerConfigs]
  );

  const sim = useMemo(
    () =>
      simulateGermanLoan({
        purchasePrice,
        brokerFeePct,
        notaryPct,
        renovationBudget,
        totalEquity,
        direktkrediteAmount,
        direktkrediteRatePct,
        annualInterestPct: interestRatePct,
        initialTilgungPct,
        annualSondertilgung,
        zinsbindungYears
      }),
    [
      purchasePrice,
      brokerFeePct,
      notaryPct,
      renovationBudget,
      totalEquity,
      direktkrediteAmount,
      direktkrediteRatePct,
      interestRatePct,
      initialTilgungPct,
      annualSondertilgung,
      zinsbindungYears
    ]
  );

  const totalNonBuyerRent = useMemo(
    () =>
      borrowerConfigs.reduce(
        (sum, b) => (!b.isCoBorrower ? sum + b.internalRentIfNonBuyer : sum),
        0
      ),
    [borrowerConfigs]
  );

  const totalLoanShareWeights = useMemo(
    () =>
      borrowerConfigs.reduce(
        (sum, b) => (b.isCoBorrower ? sum + b.loanSharePct : sum),
        0
      ),
    [borrowerConfigs]
  );

  const totalMonthlyGroupOutflow =
    sim.monthlyBankPayment + monthlyHausgeld + erbpachtMonthly;

  const netBankPaymentForBorrowers = Math.max(0, sim.monthlyBankPayment - totalNonBuyerRent);

  const applySplitPreset = (
    preset: '5-working-buy' | 'all-6-equal' | 'income-weighted' | 'syndikat-stack'
  ) => {
    if (preset === '5-working-buy') {
      setDirektkrediteAmount(0);
      setBorrowerConfigs(
        roommates.map((rm) => ({
          roommateId: rm.id,
          isCoBorrower: rm.role === 'Working',
          equityContribution: rm.role === 'Working' ? 35000 : 0,
          loanSharePct: rm.role === 'Working' ? 20 : 0,
          internalRentIfNonBuyer: rm.role === 'Student' ? 450 : 0
        }))
      );
    } else if (preset === 'all-6-equal') {
      setDirektkrediteAmount(0);
      const share = Number((100 / roommates.length).toFixed(2));
      setBorrowerConfigs(
        roommates.map((rm) => ({
          roommateId: rm.id,
          isCoBorrower: true,
          equityContribution: Math.min(rm.availableEquity, 25000),
          loanSharePct: share,
          internalRentIfNonBuyer: 0
        }))
      );
    } else if (preset === 'income-weighted') {
      setDirektkrediteAmount(0);
      const totalIncome = roommates.reduce((s, r) => s + r.netMonthlyIncome, 0);
      setBorrowerConfigs(
        roommates.map((rm) => ({
          roommateId: rm.id,
          isCoBorrower: true,
          equityContribution: Math.round(rm.availableEquity * 0.75),
          loanSharePct: Number(((rm.netMonthlyIncome / totalIncome) * 100).toFixed(1)),
          internalRentIfNonBuyer: 0
        }))
      );
    } else if (preset === 'syndikat-stack') {
      setDirektkrediteAmount(140000);
      setDirektkrediteRatePct(1.5);
      setInterestRatePct(3.85);
      setSelectedProviderId('gls-wohnprojekt');
      setBorrowerConfigs(
        roommates.map((rm) => ({
          roommateId: rm.id,
          isCoBorrower: true,
          equityContribution: 10000,
          loanSharePct: Number((100 / roommates.length).toFixed(2)),
          internalRentIfNonBuyer: 0
        }))
      );
    }
  };

  const updateBorrower = (
    roommateId: string,
    patch: Partial<BorrowerShareConfig>
  ) => {
    setBorrowerConfigs((prev) =>
      prev.map((b) => (b.roommateId === roommateId ? { ...b, ...patch } : b))
    );
  };

  const applyProvider = (p: LoanProviderBenchmark) => {
    setSelectedProviderId(p.id);
    setInterestRatePct(p.effectiveRatePct);
    setZinsbindungYears(p.zinsbindungYears);
    if (p.minTilgungPct > 0) {
      setInitialTilgungPct(p.minTilgungPct);
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Mapper Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            German Baufinanzierung & Multi-Borrower Loan Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatically maps Screener purchase prices + NRW Kaufnebenkosten (6.5% tax) across
            variable borrower structures (5 Working + 1 Student or 6-person Syndikat).
          </p>
        </div>

        <div className="w-full lg:w-96">
          <label className="block text-[11px] font-medium text-slate-400 mb-1">
            Auto-Map Screener Property Price
          </label>
          <select
            value={selectedProperty?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              onSelectPropertyId(id);
              const found = buyableListings.find((l) => l.id === id);
              if (found) {
                setPurchasePrice(found.basePriceOrColdRent);
                setBrokerFeePct(found.brokerFeePct);
                setMonthlyHausgeld(found.monthlyUtilitiesOrHausgeld);
                setErbpachtMonthly(found.erbpachtMonthly ?? 0);
              }
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
          >
            {buyableListings.map((l) => (
              <option key={l.id} value={l.id}>
                [{l.mode.toUpperCase()} • {l.veedel}] {formatEUR(l.basePriceOrColdRent)} —{' '}
                {l.title.slice(0, 42)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Controls + Summary KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Property & Loan Structure Inputs */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Acquisition & Loan Parameters
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Purchase Price (Kaufpreis)</span>
                <span className="font-bold text-white">{formatEUR(purchasePrice)}</span>
              </div>
              <input
                type="range"
                min={350000}
                max={1300000}
                step={5000}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Makler Fee (%)</label>
              <select
                value={brokerFeePct}
                onChange={(e) => setBrokerFeePct(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value={0}>0% (Private / ZVG / Ohne-Makler)</option>
                <option value={2.38}>2.38%</option>
                <option value={3.57}>3.57% (Standard Buyer Split)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Notary + Grundbuch (%)</label>
              <input
                type="number"
                step="0.1"
                value={notaryPct}
                onChange={(e) => setNotaryPct(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Renovation Buffer (€)</label>
              <input
                type="number"
                step={5000}
                value={renovationBudget}
                onChange={(e) => setRenovationBudget(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Hausgeld / Utilities (€/mo)</label>
              <input
                type="number"
                step={20}
                value={monthlyHausgeld}
                onChange={(e) => setMonthlyHausgeld(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Interest Rate (% p.a.)</label>
              <input
                type="number"
                step="0.05"
                min={0.5}
                max={8}
                value={interestRatePct}
                onChange={(e) => setInterestRatePct(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Initial Tilgung (% p.a.)</label>
              <input
                type="number"
                step="0.25"
                min={1}
                max={10}
                value={initialTilgungPct}
                onChange={(e) => setInitialTilgungPct(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Zinsbindung (Years)</label>
              <select
                value={zinsbindungYears}
                onChange={(e) => setZinsbindungYears(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value={10}>10 Years</option>
                <option value={15}>15 Years</option>
                <option value={20}>20 Years</option>
                <option value={30}>30 Years</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Annual Sondertilgung (€/yr)</label>
              <input
                type="number"
                step={1000}
                min={0}
                value={annualSondertilgung}
                onChange={(e) => setAnnualSondertilgung(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Direktkredite (Syndikat Crowd-Loan €)
              </label>
              <input
                type="number"
                step={10000}
                min={0}
                value={direktkrediteAmount}
                onChange={(e) => setDirektkrediteAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Erbpachtzins (€/mo if any)</label>
              <input
                type="number"
                step={50}
                min={0}
                value={erbpachtMonthly}
                onChange={(e) => setErbpachtMonthly(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          {/* NRW Kaufnebenkosten Breakdown */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
            <div className="font-semibold text-slate-200 mb-1">
              NRW Acquisition Cost Breakdown
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Kaufpreis</span>
              <span className="text-slate-200">{formatEUR(sim.purchasePrice)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>NRW Grunderwerbsteuer (6.5%)</span>
              <span className="text-amber-300">+{formatEUR(sim.nrwTransferTax)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Notary & Grundbuch ({notaryPct}%)</span>
              <span className="text-slate-200">+{formatEUR(sim.notaryAndGrundbuch)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Maklerprovision ({brokerFeePct}%)</span>
              <span className="text-slate-200">+{formatEUR(sim.brokerFee)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Renovation Reserve</span>
              <span className="text-slate-200">+{formatEUR(sim.renovationReserve)}</span>
            </div>
            <div className="flex justify-between font-bold text-white pt-1.5 border-t border-slate-800">
              <span>Total Project Capital Needed</span>
              <span>{formatEUR(sim.totalAcquisitionCost)}</span>
            </div>
          </div>
        </div>

        {/* Right: Repayment KPIs & Variable Borrower Split */}
        <div className="lg:col-span-7 space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Repayment Duration</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {sim.payoffYearsLabel}
              </div>
              <div className="text-[10px] text-slate-500">
                incl. {formatEUR(annualSondertilgung)}/yr Sonder
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Bank + Direktkredit / Mo</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {formatEUR(Math.round(sim.monthlyBankPayment))}
              </div>
              <div className="text-[10px] text-slate-500">
                +{formatEUR(monthlyHausgeld + erbpachtMonthly)} utilities/Pacht
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">
                Restschuld after {zinsbindungYears}y
              </div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">
                {formatEUR(sim.restschuldAtZinsbindung)}
              </div>
              <div className="text-[10px] text-slate-500">
                LTV: {sim.ltvPct.toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400">Total Equity + Direktkredite</div>
              <div className="text-xl font-bold text-sky-400 mt-0.5">
                {formatEUR(totalEquity + direktkrediteAmount)}
              </div>
              <div className="text-[10px] text-slate-500">
                Bank Loan: {formatEUR(Math.max(0, sim.totalLoanAmount - direktkrediteAmount))}
              </div>
            </div>
          </div>

          {/* Multi-Borrower Variable Split Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  Variable Multi-Borrower Split (5 Working + 1 Student)
                </h3>
                <p className="text-xs text-slate-400">
                  Adjust who signs the bank mortgage, individual equity, and internal WG rent for
                  non-buyers.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => applySplitPreset('5-working-buy')}
                  className="px-2.5 py-1 rounded bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-[11px] font-medium"
                >
                  5 Working Buy + Student Rents
                </button>
                <button
                  onClick={() => applySplitPreset('all-6-equal')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                >
                  Equal 6-Way
                </button>
                <button
                  onClick={() => applySplitPreset('income-weighted')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                >
                  Income-Weighted
                </button>
                <button
                  onClick={() => applySplitPreset('syndikat-stack')}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px]"
                >
                  Syndikat + €140k Direktkredite
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2">Roommate</th>
                    <th className="py-2 px-2">Co-Borrower?</th>
                    <th className="py-2 px-2">Equity (€)</th>
                    <th className="py-2 px-2">Loan Share (%) / Rent (€)</th>
                    <th className="py-2 pl-2 text-right">Monthly Total (incl. NK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {roommates.map((rm) => {
                    const cfg = borrowerConfigs.find((b) => b.roommateId === rm.id)!;
                    const utilShare = (monthlyHausgeld + erbpachtMonthly) / roommates.length;
                    const normalizedWeight =
                      cfg.isCoBorrower && totalLoanShareWeights > 0
                        ? cfg.loanSharePct / totalLoanShareWeights
                        : 0;
                    const personLoanPayment = cfg.isCoBorrower
                      ? netBankPaymentForBorrowers * normalizedWeight
                      : cfg.internalRentIfNonBuyer;
                    const personTotalMonthly = Math.round(personLoanPayment + utilShare);

                    return (
                      <tr key={rm.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 pr-2">
                          <div className="font-medium text-white">{rm.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {rm.role} • Net {formatEUR(rm.netMonthlyIncome)}/mo
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="checkbox"
                            checked={cfg.isCoBorrower}
                            onChange={(e) =>
                              updateBorrower(rm.id, {
                                isCoBorrower: e.target.checked,
                                loanSharePct: e.target.checked ? 20 : 0
                              })
                            }
                            className="rounded border-slate-600 bg-slate-800"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          <input
                            type="number"
                            step={2500}
                            min={0}
                            value={cfg.equityContribution}
                            onChange={(e) =>
                              updateBorrower(rm.id, {
                                equityContribution: Number(e.target.value)
                              })
                            }
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                          />
                        </td>
                        <td className="py-2.5 px-2">
                          {cfg.isCoBorrower ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step={1}
                                min={0}
                                max={100}
                                value={cfg.loanSharePct}
                                onChange={(e) =>
                                  updateBorrower(rm.id, {
                                    loanSharePct: Number(e.target.value)
                                  })
                                }
                                className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                              <span className="text-slate-400">% share</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step={25}
                                min={0}
                                value={cfg.internalRentIfNonBuyer}
                                onChange={(e) =>
                                  updateBorrower(rm.id, {
                                    internalRentIfNonBuyer: Number(e.target.value)
                                  })
                                }
                                className="w-20 bg-slate-950 border border-amber-500/40 rounded px-2 py-1 text-amber-200"
                              />
                              <span className="text-amber-300/80">€/mo rent</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-bold text-sky-400">
                          {formatEUR(personTotalMonthly)}/mo
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 text-xs pt-2 border-t border-slate-800 text-slate-400">
              <span>
                Non-buyer rent offset:{' '}
                <strong className="text-amber-300">{formatEUR(totalNonBuyerRent)}/mo</strong> reduces
                co-borrowers’ bank burden
              </span>
              <span>
                Combined Group Monthly Cashflow:{' '}
                <strong className="text-white">{formatEUR(Math.round(totalMonthlyGroupOutflow))}/mo</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Providers & Promotional Credit Comparison */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              German Loan & Promotional Credit Comparison (Click to Apply Rate)
            </h3>
            <p className="text-xs text-slate-400">
              Compare commercial mortgage brokers, Cologne regional banks, KfW 124/261, NRW.BANK,
              and GLS / Syndikat Direktkredite.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {loanProviders.map((p) => {
            const active = selectedProviderId === p.id;
            return (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  active
                    ? 'bg-indigo-950/35 border-indigo-500/60'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300">
                      {p.category}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold text-xs">
                      {p.effectiveRatePct.toFixed(2)}% eff.
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white">{p.name}</h4>
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>Fixed: {p.zinsbindungYears}y</span>
                    <span>Min Tilgung: {p.minTilgungPct}%</span>
                    <span>Sondertilgung: {p.sondertilgungPct}%/yr</span>
                    {p.repaymentGrantPct && (
                      <span className="text-emerald-400 font-semibold">
                        Up to {p.repaymentGrantPct}–40% Grant!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pt-1">{p.notes}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:underline inline-flex items-center gap-1"
                  >
                    Portal <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => applyProvider(p)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 hover:bg-indigo-600 text-slate-200'
                    }`}
                  >
                    {active ? <Check className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
                    <span>{active ? 'Applied' : 'Simulate Rate'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Amortization Schedule (Tilgungsplan) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" />
            Repayment Timeline over Time (Tilgungsplan)
          </h3>
          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span>
              Total Interest over Lifetime:{' '}
              <strong className="text-rose-300">{formatEUR(sim.totalInterestPaid)}</strong>
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Coins className="w-3.5 h-3.5" /> Debt-free in {sim.payoffYearsLabel}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs text-left">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 px-2">Year</th>
                <th className="py-2 px-2">Start Debt</th>
                <th className="py-2 px-2">Interest Paid</th>
                <th className="py-2 px-2">Principal + Sonder</th>
                <th className="py-2 px-2">Remaining Debt</th>
                <th className="py-2 px-2 w-40">Payoff Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sim.schedule.map((row) => {
                const initialDebt = Math.max(1, sim.schedule[0]?.startDebt ?? 1);
                const paidPct = Math.min(
                  100,
                  Math.max(0, ((initialDebt - row.endDebt) / initialDebt) * 100)
                );
                const isZinsbindungEnd = row.year === zinsbindungYears;

                return (
                  <tr
                    key={row.year}
                    className={
                      isZinsbindungEnd
                        ? 'bg-amber-500/10 font-semibold'
                        : 'hover:bg-slate-800/30'
                    }
                  >
                    <td className="py-2 px-2 text-slate-200">
                      Yr {row.year}{' '}
                      {isZinsbindungEnd && (
                        <span className="text-[10px] text-amber-300">(Zinsbindung)</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-slate-300">{formatEUR(row.startDebt)}</td>
                    <td className="py-2 px-2 text-rose-300">{formatEUR(row.interestPaid)}</td>
                    <td className="py-2 px-2 text-emerald-300">
                      {formatEUR(row.principalRepaid + row.sondertilgungPaid)}
                    </td>
                    <td className="py-2 px-2 text-white font-medium">{formatEUR(row.endDebt)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${paidPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-9 text-right">
                          {Math.round(paidPct)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
