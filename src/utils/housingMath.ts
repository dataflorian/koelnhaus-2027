import { PropertyListing, RoommateProfile } from '../types/housing';

export function buildGoogleMapsUrl(listing: PropertyListing): string {
  const query = listing.googleMapsQuery?.trim()
    ? listing.googleMapsQuery
    : `${listing.lat},${listing.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsDirectionsUrl(
  listing: PropertyListing,
  destinationName: string
): string {
  const origin = listing.googleMapsQuery?.trim()
    ? listing.googleMapsQuery
    : `${listing.lat},${listing.lng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(destinationName + ', Köln')}&travelmode=transit`;
}

export interface CommuteAssessment {
  maxKvbMins: number;
  avgKvbMins: number;
  flaggedRoommates: Array<{
    roommate: RoommateProfile;
    kvbMins: number;
    bikeMins: number;
    overByMins: number;
  }>;
  hasFlag: boolean;
}

export function assessCommutes(
  listing: PropertyListing,
  roommates: RoommateProfile[],
  customMaxLimit?: number
): CommuteAssessment {
  const flaggedRoommates: CommuteAssessment['flaggedRoommates'] = [];
  let maxKvbMins = 0;
  let totalKvb = 0;

  for (const rm of roommates) {
    const time = listing.commutes[rm.id] ?? { kvbMins: 30, bikeMins: 25 };
    if (time.kvbMins > maxKvbMins) maxKvbMins = time.kvbMins;
    totalKvb += time.kvbMins;

    const threshold =
      customMaxLimit !== undefined ? Math.min(rm.maxCommuteMins, customMaxLimit) : rm.maxCommuteMins;
    if (time.kvbMins > threshold) {
      flaggedRoommates.push({
        roommate: rm,
        kvbMins: time.kvbMins,
        bikeMins: time.bikeMins,
        overByMins: time.kvbMins - threshold
      });
    }
  }

  return {
    maxKvbMins,
    avgKvbMins: Math.round(totalKvb / Math.max(1, roommates.length)),
    flaggedRoommates,
    hasFlag: flaggedRoommates.length > 0
  };
}

export interface AmortizationYearRow {
  year: number;
  startDebt: number;
  annualPayment: number;
  interestPaid: number;
  principalRepaid: number;
  sondertilgungPaid: number;
  endDebt: number;
}

export interface LoanSimulationResult {
  purchasePrice: number;
  nrwTransferTax: number;
  notaryAndGrundbuch: number;
  brokerFee: number;
  renovationReserve: number;
  totalAcquisitionCost: number;
  totalLoanAmount: number;
  ltvPct: number;
  monthlyBankPayment: number;
  initialMonthlyInterest: number;
  initialMonthlyPrincipal: number;
  payoffMonths: number;
  payoffYearsLabel: string;
  totalInterestPaid: number;
  restschuldAtZinsbindung: number;
  schedule: AmortizationYearRow[];
}

export interface LoanSimulationInput {
  purchasePrice: number;
  brokerFeePct: number;
  notaryPct: number;
  renovationBudget: number;
  totalEquity: number;
  direktkrediteAmount: number;
  direktkrediteRatePct: number;
  annualInterestPct: number;
  initialTilgungPct: number;
  annualSondertilgung: number;
  zinsbindungYears: number;
}

export function simulateGermanLoan(input: LoanSimulationInput): LoanSimulationResult {
  const nrwTransferTax = Math.round(input.purchasePrice * 0.065);
  const notaryAndGrundbuch = Math.round(input.purchasePrice * (input.notaryPct / 100));
  const brokerFee = Math.round(input.purchasePrice * (input.brokerFeePct / 100));
  const totalAcquisitionCost =
    input.purchasePrice + nrwTransferTax + notaryAndGrundbuch + brokerFee + input.renovationBudget;

  const bankLoanAmount = Math.max(
    0,
    totalAcquisitionCost - input.totalEquity - input.direktkrediteAmount
  );
  const totalLoanAmount = bankLoanAmount + input.direktkrediteAmount;
  const ltvPct = input.purchasePrice > 0 ? (bankLoanAmount / input.purchasePrice) * 100 : 0;

  const monthlyBankRate =
    bankLoanAmount * ((input.annualInterestPct + input.initialTilgungPct) / 100 / 12);
  const monthlyDirektkreditInterest =
    input.direktkrediteAmount * (input.direktkrediteRatePct / 100 / 12);
  const monthlyBankPayment = monthlyBankRate + monthlyDirektkreditInterest;

  const monthlyRateDec = input.annualInterestPct / 100 / 12;
  let remainingBank = bankLoanAmount;
  let totalInterestPaid = 0;
  let months = 0;
  const maxMonths = 600;
  const schedule: AmortizationYearRow[] = [];

  let restschuldAtZinsbindung = bankLoanAmount;
  let currentYear = 1;

  while (remainingBank > 0.01 && months < maxMonths) {
    const startDebt = remainingBank;
    let yearInterest = 0;
    let yearPrincipal = 0;
    let yearPayment = 0;
    let yearSonder = 0;

    for (let m = 1; m <= 12; m++) {
      if (remainingBank <= 0.01) break;
      months++;
      const interest = remainingBank * monthlyRateDec;
      let principal = monthlyBankRate - interest;
      if (principal <= 0 && remainingBank > 0) {
        principal = 0;
      }
      if (principal > remainingBank) {
        principal = remainingBank;
      }
      remainingBank -= principal;
      yearInterest += interest;
      yearPrincipal += principal;
      yearPayment += interest + principal;
      totalInterestPaid += interest;

      if (months === input.zinsbindungYears * 12) {
        restschuldAtZinsbindung = remainingBank;
      }
    }

    if (remainingBank > 0.01 && input.annualSondertilgung > 0) {
      const sonder = Math.min(remainingBank, input.annualSondertilgung);
      remainingBank -= sonder;
      yearSonder = sonder;
    }

    schedule.push({
      year: currentYear,
      startDebt: Math.round(startDebt),
      annualPayment: Math.round(yearPayment),
      interestPaid: Math.round(yearInterest),
      principalRepaid: Math.round(yearPrincipal),
      sondertilgungPaid: Math.round(yearSonder),
      endDebt: Math.round(Math.max(0, remainingBank))
    });

    if (currentYear === input.zinsbindungYears) {
      restschuldAtZinsbindung = Math.round(Math.max(0, remainingBank));
    }

    if (yearPrincipal + yearSondertilgung <= 0.01) {
      break;
    }
    currentYear++;
  }

  if (months < input.zinsbindungYears * 12) {
    restschuldAtZinsbindung = 0;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const payoffYearsLabel =
    bankLoanAmount === 0
      ? '0 yrs (Fully covered)'
      : months >= maxMonths && remainingBank > 1
        ? '50+ yrs (Increase Tilgung %)'
        : `${years} yrs ${remMonths} mos`;

  return {
    purchasePrice: input.purchasePrice,
    nrwTransferTax,
    notaryAndGrundbuch,
    brokerFee,
    renovationReserve: input.renovationBudget,
    totalAcquisitionCost,
    totalLoanAmount,
    ltvPct,
    monthlyBankPayment,
    initialMonthlyInterest: bankLoanAmount * monthlyRateDec + monthlyDirektkreditInterest,
    initialMonthlyPrincipal: Math.max(0, monthlyBankRate - bankLoanAmount * monthlyRateDec),
    payoffMonths: months,
    payoffYearsLabel,
    totalInterestPaid: Math.round(totalInterestPaid),
    restschuldAtZinsbindung: Math.round(restschuldAtZinsbindung),
    schedule
  };
}

export function formatEUR(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount);
}
