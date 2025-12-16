import React, { useState, useMemo } from 'react';

export default function FinancialModel() {
  const [assumptions, setAssumptions] = useState({
    tripwirePrice: 17,
    aov: 29,
    communityPrice: 49,
    innerCirclePrice: 99,
    oneOnOnePrice: 2500,
    cpc: 0.50,
    landingPageConv: 0.32,
    leadToPurchase: 0.02,
    leadToCommunity: 0.015,
    buyerToCommunity: 0.06,
    communityToIC: 0.08,
    icToOneOnOne: 0.02,
    communityToOneOnOne: 0.005,
    communityChurn: 0.10,
    icChurn: 0.06,
    skoolCost: 99,
    skoolTransactionFee: 0.029,
    emailCost: 49,
    stripePercent: 0.029,
    stripeFixed: 0.30,
    taxRate: 0.30,
    miscSoftware: 50,
  });

  const [activeTab, setActiveTab] = useState('summary');

  const monthlyAdSpend = [
    0, 300, 500, 750, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400,
    2600, 2800, 3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 4800
  ];

  const organicLeads = [
    75, 100, 125, 175, 225, 275, 350, 425, 500, 530, 560, 590,
    620, 650, 680, 710, 740, 770, 800, 830, 860, 890, 920, 950
  ];

  const data = useMemo(() => {
    let cumulativeLeads = 0;
    let cumulativeCommunity = 0;
    let cumulativeIC = 0;
    let cumulativeTripwireBuyers = 0;
    let cumulativeRevenue = 0;
    let cumulativeExpenses = 0;
    let cumulativeProfit = 0;
    let cumulativeOneOnOne = 0;

    return Array.from({ length: 24 }, (_, i) => {
      const month = i + 1;
      const adSpend = monthlyAdSpend[i];
      const cpcAdjusted = assumptions.cpc * (1 - Math.min(i * 0.01, 0.15));
      const clicks = adSpend > 0 ? Math.round(adSpend / cpcAdjusted) : 0;
      const convRateAdjusted = Math.min(assumptions.landingPageConv + (i * 0.005), 0.48);
      const paidLeads = Math.round(clicks * convRateAdjusted);
      const organic = organicLeads[i];
      const totalLeads = paidLeads + organic;
      const cpl = totalLeads > 0 ? adSpend / totalLeads : 0;

      cumulativeLeads += totalLeads;

      const purchaseRateAdjusted = Math.min(assumptions.leadToPurchase + (i * 0.002), 0.07);
      const tripwireBuyers = Math.round(totalLeads * purchaseRateAdjusted);
      cumulativeTripwireBuyers += tripwireBuyers;
      const tripwireRevenue = tripwireBuyers * assumptions.aov;

      const newFromBuyers = Math.round(tripwireBuyers * assumptions.buyerToCommunity);
      const newFromLeads = Math.round(totalLeads * assumptions.communityToIC * 0.5);
      const newCommunityMembers = newFromBuyers + newFromLeads + Math.round(cumulativeLeads * 0.002);
      const churnedCommunity = Math.round(cumulativeCommunity * assumptions.communityChurn);
      cumulativeCommunity = Math.max(0, cumulativeCommunity + newCommunityMembers - churnedCommunity);
      const communityRevenue = cumulativeCommunity * assumptions.communityPrice;

      const eligibleForUpgrade = Math.max(0, cumulativeCommunity - newCommunityMembers);
      const newIC = month >= 2 ? Math.round(eligibleForUpgrade * assumptions.communityToIC * 0.15) : 0;
      const churnedIC = Math.round(cumulativeIC * assumptions.icChurn);
      cumulativeIC = Math.max(0, cumulativeIC + newIC - churnedIC);
      const icRevenue = cumulativeIC * assumptions.innerCirclePrice;

      let oneOnOneSales = 0;
      if (month >= 3) {
        const fromIC = Math.floor(cumulativeIC * assumptions.icToOneOnOne * 0.4);
        const fromCommunity = Math.floor(cumulativeCommunity * assumptions.communityToOneOnOne * 0.3);
        oneOnOneSales = Math.max(1, fromIC + fromCommunity);
        oneOnOneSales = Math.min(oneOnOneSales, 5);
      }
      cumulativeOneOnOne += oneOnOneSales;
      const oneOnOneRevenue = oneOnOneSales * assumptions.oneOnOnePrice;

      const totalRevenue = tripwireRevenue + communityRevenue + icRevenue + oneOnOneRevenue;
      const mrr = communityRevenue + icRevenue;

      const baseExpenses = adSpend + 
        (month >= 2 ? assumptions.skoolCost : 0) + 
        (cumulativeLeads > 2500 ? assumptions.emailCost : 0) +
        (month >= 2 ? assumptions.miscSoftware : 0);

      // Calculate Stripe fees on tripwire + upsell revenue only (not through Skool)
      const tripwireTransactions = tripwireBuyers;
      const stripeFeesTripwire = (tripwireRevenue * assumptions.stripePercent) + (tripwireTransactions * assumptions.stripeFixed);
      
      // Calculate Skool fees: 2.9% Skool + 2.9% Stripe + $0.30 per transaction
      const communityTransactions = cumulativeCommunity;
      const icTransactions = cumulativeIC;
      const skoolRevenue = communityRevenue + icRevenue;
      const skoolPlatformFee = skoolRevenue * assumptions.skoolTransactionFee;
      const skoolStripeFee = (skoolRevenue * assumptions.stripePercent) + ((communityTransactions + icTransactions) * assumptions.stripeFixed);
      const skoolTransactionFees = skoolPlatformFee + skoolStripeFee;
      
      // Stripe fees on 1:1 (processed outside Skool)
      const oneOnOneStripeFees = oneOnOneSales > 0 ? (oneOnOneRevenue * assumptions.stripePercent) + (oneOnOneSales * assumptions.stripeFixed) : 0;
      
      const totalPaymentFees = stripeFeesTripwire + skoolTransactionFees + oneOnOneStripeFees;
      const stripeFees = stripeFeesTripwire + oneOnOneStripeFees;
      
      const totalExpenses = baseExpenses + totalPaymentFees;
      const preTaxProfit = totalRevenue - totalExpenses;
      const taxSetAside = preTaxProfit > 0 ? preTaxProfit * assumptions.taxRate : 0;
      const takeHome = preTaxProfit - taxSetAside;

      cumulativeRevenue += totalRevenue;
      cumulativeExpenses += totalExpenses;
      cumulativeProfit += preTaxProfit;

      return {
        month,
        adSpend,
        clicks,
        paidLeads,
        organicLeads: organic,
        totalLeads,
        cpl: cpl.toFixed(2),
        cumulativeLeads,
        tripwireBuyers,
        cumulativeTripwireBuyers,
        tripwireRevenue,
        newCommunityMembers,
        churnedCommunity,
        communityMembers: cumulativeCommunity,
        communityRevenue,
        newIC,
        churnedIC,
        icMembers: cumulativeIC,
        icRevenue,
        oneOnOneSales,
        cumulativeOneOnOne,
        oneOnOneRevenue,
        totalRevenue,
        mrr,
        baseExpenses,
        stripeFees: Math.round(stripeFees),
        skoolFees: Math.round(skoolTransactionFees),
        totalPaymentFees: Math.round(totalPaymentFees),
        totalExpenses: Math.round(totalExpenses),
        preTaxProfit: Math.round(preTaxProfit),
        taxSetAside: Math.round(taxSetAside),
        takeHome: Math.round(takeHome),
        cumulativeRevenue,
        cumulativeExpenses,
        cumulativeProfit,
      };
    });
  }, [assumptions]);

  const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const year1 = data.slice(0, 12);
  const year2 = data.slice(12, 24);
  const year1Total = year1[11];
  const year2Total = year2[11];

  const summaryStats = {
    year1Revenue: year1Total.cumulativeRevenue,
    year1Expenses: year1Total.cumulativeExpenses,
    year1Profit: year1Total.cumulativeProfit,
    year1TakeHome: year1.reduce((sum, m) => sum + m.takeHome, 0),
    year1Tax: year1.reduce((sum, m) => sum + m.taxSetAside, 0),
    year1Leads: year1Total.cumulativeLeads,
    year1Community: year1Total.communityMembers,
    year1IC: year1Total.icMembers,
    year1OneOnOne: year1Total.cumulativeOneOnOne,
    year1MRR: year1Total.mrr,
    year2Revenue: year2Total.cumulativeRevenue - year1Total.cumulativeRevenue,
    year2Expenses: year2Total.cumulativeExpenses - year1Total.cumulativeExpenses,
    year2Profit: year2Total.cumulativeProfit - year1Total.cumulativeProfit,
    year2TakeHome: year2.reduce((sum, m) => sum + m.takeHome, 0),
    year2Tax: year2.reduce((sum, m) => sum + m.taxSetAside, 0),
    year2Leads: year2Total.cumulativeLeads - year1Total.cumulativeLeads,
    year2Community: year2Total.communityMembers,
    year2IC: year2Total.icMembers,
    year2OneOnOne: year2Total.cumulativeOneOnOne - year1Total.cumulativeOneOnOne,
    year2MRR: year2Total.mrr,
  };

  const resetDefaults = () => {
    setAssumptions({
      tripwirePrice: 17, aov: 29, communityPrice: 49, innerCirclePrice: 99,
      oneOnOnePrice: 2500, cpc: 0.50, landingPageConv: 0.32, leadToPurchase: 0.02,
      leadToCommunity: 0.015, buyerToCommunity: 0.06, communityToIC: 0.08,
      icToOneOnOne: 0.02, communityToOneOnOne: 0.005, communityChurn: 0.10,
      icChurn: 0.06, skoolCost: 99, skoolTransactionFee: 0.029, emailCost: 49, stripePercent: 0.029,
      stripeFixed: 0.30, taxRate: 0.30, miscSoftware: 50
    });
  };

  return (
    <div className="p-4 bg-gray-900 text-gray-100 min-h-screen text-sm">
      <h1 className="text-2xl font-bold mb-4 text-white">Sobriety Formula: 24-Month Financial Model</h1>
      
      <div className="flex gap-2 mb-4 flex-wrap">
        {['summary', 'monthly', 'expenses', 'assumptions'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Year 1 Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Total Revenue:</span><span className="text-green-400 font-semibold">{formatCurrency(summaryStats.year1Revenue)}</span></div>
                <div className="flex justify-between"><span>Total Expenses:</span><span className="text-red-400">{formatCurrency(summaryStats.year1Expenses)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2"><span>Pre-Tax Profit:</span><span className="text-green-400">{formatCurrency(summaryStats.year1Profit)}</span></div>
                <div className="flex justify-between"><span>Tax Set-Aside (30%):</span><span className="text-yellow-400">-{formatCurrency(summaryStats.year1Tax)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2"><span>Take-Home:</span><span className="text-green-400 font-bold">{formatCurrency(summaryStats.year1TakeHome)}</span></div>
                <div className="flex justify-between"><span>Ending MRR:</span><span className="text-blue-400">{formatCurrency(summaryStats.year1MRR)}/mo</span></div>
                <div className="flex justify-between"><span>Total Leads:</span><span>{summaryStats.year1Leads.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Community Members:</span><span>{summaryStats.year1Community}</span></div>
                <div className="flex justify-between"><span>Inner Circle:</span><span>{summaryStats.year1IC}</span></div>
                <div className="flex justify-between"><span>1:1 Clients Sold:</span><span>{summaryStats.year1OneOnOne}</span></div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Year 2 Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span>Total Revenue:</span><span className="text-green-400 font-semibold">{formatCurrency(summaryStats.year2Revenue)}</span></div>
                <div className="flex justify-between"><span>Total Expenses:</span><span className="text-red-400">{formatCurrency(summaryStats.year2Expenses)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2"><span>Pre-Tax Profit:</span><span className="text-green-400">{formatCurrency(summaryStats.year2Profit)}</span></div>
                <div className="flex justify-between"><span>Tax Set-Aside (30%):</span><span className="text-yellow-400">-{formatCurrency(summaryStats.year2Tax)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2"><span>Take-Home:</span><span className="text-green-400 font-bold">{formatCurrency(summaryStats.year2TakeHome)}</span></div>
                <div className="flex justify-between"><span>Ending MRR:</span><span className="text-blue-400">{formatCurrency(summaryStats.year2MRR)}/mo</span></div>
                <div className="flex justify-between"><span>Total Leads:</span><span>{summaryStats.year2Leads.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Community Members:</span><span>{summaryStats.year2Community}</span></div>
                <div className="flex justify-between"><span>Inner Circle:</span><span>{summaryStats.year2IC}</span></div>
                <div className="flex justify-between"><span>1:1 Clients Sold:</span><span>{summaryStats.year2OneOnOne}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-400">24-Month Totals</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-2xl font-bold text-green-400">{formatCurrency(year2Total.cumulativeRevenue)}</div>
                <div className="text-gray-400">Total Revenue</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-2xl font-bold text-green-400">{formatCurrency(summaryStats.year1TakeHome + summaryStats.year2TakeHome)}</div>
                <div className="text-gray-400">Take-Home (After Tax)</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-2xl font-bold text-blue-400">{formatCurrency(year2Total.mrr)}</div>
                <div className="text-gray-400">Ending MRR</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded">
                <div className="text-2xl font-bold text-purple-400">{year2Total.communityMembers + year2Total.icMembers}</div>
                <div className="text-gray-400">Total Members</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-400">Monthly Progression</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="p-2 text-left">Month</th>
                    <th className="p-2 text-right">Revenue</th>
                    <th className="p-2 text-right">Expenses</th>
                    <th className="p-2 text-right">Pre-Tax</th>
                    <th className="p-2 text-right">Take-Home</th>
                    <th className="p-2 text-right">MRR</th>
                    <th className="p-2 text-right">Comm</th>
                    <th className="p-2 text-right">IC</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-700 ${i === 11 ? 'bg-blue-900/30' : ''}`}>
                      <td className="p-2">{row.month}</td>
                      <td className="p-2 text-right text-green-400">{formatCurrency(row.totalRevenue)}</td>
                      <td className="p-2 text-right text-red-400">{formatCurrency(row.totalExpenses)}</td>
                      <td className={`p-2 text-right ${row.preTaxProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(row.preTaxProfit)}</td>
                      <td className={`p-2 text-right font-semibold ${row.takeHome >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(row.takeHome)}</td>
                      <td className="p-2 text-right text-blue-400">{formatCurrency(row.mrr)}</td>
                      <td className="p-2 text-right">{row.communityMembers}</td>
                      <td className="p-2 text-right">{row.icMembers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-800 sticky top-0">
              <tr className="text-gray-400">
                <th className="p-2 text-left border-b border-gray-700">Mo</th>
                <th className="p-2 text-right border-b border-gray-700">Ad $</th>
                <th className="p-2 text-right border-b border-gray-700">Leads</th>
                <th className="p-2 text-right border-b border-gray-700">CPL</th>
                <th className="p-2 text-right border-b border-gray-700">Buyers</th>
                <th className="p-2 text-right border-b border-gray-700">Comm</th>
                <th className="p-2 text-right border-b border-gray-700">IC</th>
                <th className="p-2 text-right border-b border-gray-700">1:1</th>
                <th className="p-2 text-right border-b border-gray-700">Revenue</th>
                <th className="p-2 text-right border-b border-gray-700">Fees</th>
                <th className="p-2 text-right border-b border-gray-700">Expenses</th>
                <th className="p-2 text-right border-b border-gray-700">Pre-Tax</th>
                <th className="p-2 text-right border-b border-gray-700">Tax</th>
                <th className="p-2 text-right border-b border-gray-700">Take-Home</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={`border-b border-gray-800 hover:bg-gray-800 ${i === 11 ? 'bg-blue-900/20' : ''}`}>
                  <td className="p-2 font-semibold">{row.month}</td>
                  <td className="p-2 text-right">{formatCurrency(row.adSpend)}</td>
                  <td className="p-2 text-right">{row.totalLeads}</td>
                  <td className="p-2 text-right">${row.cpl}</td>
                  <td className="p-2 text-right">{row.tripwireBuyers}</td>
                  <td className="p-2 text-right">{row.communityMembers}</td>
                  <td className="p-2 text-right">{row.icMembers}</td>
                  <td className="p-2 text-right">{row.oneOnOneSales}</td>
                  <td className="p-2 text-right text-green-400 font-semibold">{formatCurrency(row.totalRevenue)}</td>
                  <td className="p-2 text-right text-orange-400">{formatCurrency(row.totalPaymentFees)}</td>
                  <td className="p-2 text-right text-red-400">{formatCurrency(row.totalExpenses)}</td>
                  <td className={`p-2 text-right ${row.preTaxProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(row.preTaxProfit)}</td>
                  <td className="p-2 text-right text-yellow-400">{formatCurrency(row.taxSetAside)}</td>
                  <td className={`p-2 text-right font-semibold ${row.takeHome >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(row.takeHome)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Expense Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">Year 1 Expenses</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Ad Spend:</span><span className="text-red-400">{formatCurrency(year1.reduce((s,m) => s + m.adSpend, 0))}</span></div>
                <div className="flex justify-between"><span>Skool:</span><span className="text-red-400">{formatCurrency(11 * assumptions.skoolCost)}</span></div>
                <div className="flex justify-between"><span>Email Platform:</span><span className="text-red-400">{formatCurrency(year1.filter(m => m.cumulativeLeads > 2500).length * assumptions.emailCost)}</span></div>
                <div className="flex justify-between"><span>Misc Software:</span><span className="text-red-400">{formatCurrency(11 * assumptions.miscSoftware)}</span></div>
                <div className="flex justify-between"><span>Stripe Fees:</span><span className="text-orange-400">{formatCurrency(year1.reduce((s,m) => s + m.stripeFees, 0))}</span></div>
                <div className="flex justify-between"><span>Skool Fees:</span><span className="text-orange-400">{formatCurrency(year1.reduce((s,m) => s + m.skoolFees, 0))}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2 font-semibold"><span>Total Expenses:</span><span className="text-red-400">{formatCurrency(summaryStats.year1Expenses)}</span></div>
                <div className="flex justify-between"><span>Tax Set-Aside:</span><span className="text-yellow-400">{formatCurrency(summaryStats.year1Tax)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2 font-bold"><span>Total Cash Out:</span><span className="text-red-400">{formatCurrency(summaryStats.year1Expenses + summaryStats.year1Tax)}</span></div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Year 2 Expenses</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Ad Spend:</span><span className="text-red-400">{formatCurrency(year2.reduce((s,m) => s + m.adSpend, 0))}</span></div>
                <div className="flex justify-between"><span>Skool:</span><span className="text-red-400">{formatCurrency(12 * assumptions.skoolCost)}</span></div>
                <div className="flex justify-between"><span>Email Platform:</span><span className="text-red-400">{formatCurrency(12 * assumptions.emailCost)}</span></div>
                <div className="flex justify-between"><span>Misc Software:</span><span className="text-red-400">{formatCurrency(12 * assumptions.miscSoftware)}</span></div>
                <div className="flex justify-between"><span>Stripe Fees:</span><span className="text-orange-400">{formatCurrency(year2.reduce((s,m) => s + m.stripeFees, 0))}</span></div>
                <div className="flex justify-between"><span>Skool Fees:</span><span className="text-orange-400">{formatCurrency(year2.reduce((s,m) => s + m.skoolFees, 0))}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2 font-semibold"><span>Total Expenses:</span><span className="text-red-400">{formatCurrency(summaryStats.year2Expenses)}</span></div>
                <div className="flex justify-between"><span>Tax Set-Aside:</span><span className="text-yellow-400">{formatCurrency(summaryStats.year2Tax)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2 font-bold"><span>Total Cash Out:</span><span className="text-red-400">{formatCurrency(summaryStats.year2Expenses + summaryStats.year2Tax)}</span></div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-yellow-400">24-Month Total</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Ad Spend:</span><span className="text-red-400">{formatCurrency(data.reduce((s,m) => s + m.adSpend, 0))}</span></div>
                <div className="flex justify-between"><span>Skool:</span><span className="text-red-400">{formatCurrency(23 * assumptions.skoolCost)}</span></div>
                <div className="flex justify-between"><span>Email Platform:</span><span className="text-red-400">{formatCurrency(data.filter(m => m.cumulativeLeads > 2500).length * assumptions.emailCost)}</span></div>
                <div className="flex justify-between"><span>Misc Software:</span><span className="text-red-400">{formatCurrency(23 * assumptions.miscSoftware)}</span></div>
                <div className="flex justify-between"><span>Stripe Fees:</span><span className="text-orange-400">{formatCurrency(data.reduce((s,m) => s + m.stripeFees, 0))}</span></div>
                <div className="flex justify-between"><span>Skool Fees:</span><span className="text-orange-400">{formatCurrency(data.reduce((s,m) => s + m.skoolFees, 0))}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2 font-semibold"><span>Total Expenses:</span><span className="text-red-400">{formatCurrency(year2Total.cumulativeExpenses)}</span></div>
                <div className="flex justify-between"><span>Tax Set-Aside:</span><span className="text-yellow-400">{formatCurrency(summaryStats.year1Tax + summaryStats.year2Tax)}</span></div>
                <div className="flex justify-between border-t border-gray-600 pt-2 font-bold"><span>Total Cash Out:</span><span className="text-red-400">{formatCurrency(year2Total.cumulativeExpenses + summaryStats.year1Tax + summaryStats.year2Tax)}</span></div>
              </div>
            </div>
          </div>

          {/* Expense Breakdown by Percentage */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-400">Expense Breakdown (24-Month)</h3>
            <div className="space-y-3">
              {(() => {
                const totalAdSpend = data.reduce((s,m) => s + m.adSpend, 0);
                const totalSkool = 23 * assumptions.skoolCost;
                const totalEmail = data.filter(m => m.cumulativeLeads > 2500).length * assumptions.emailCost;
                const totalMisc = 23 * assumptions.miscSoftware;
                const totalStripe = data.reduce((s,m) => s + m.stripeFees, 0);
                const totalExp = year2Total.cumulativeExpenses;
                const totalTax = summaryStats.year1Tax + summaryStats.year2Tax;
                const grandTotal = totalExp + totalTax;
                
                const items = [
                  { name: 'Ad Spend', value: totalAdSpend, color: 'bg-red-500' },
                  { name: 'Stripe Fees', value: totalStripe, color: 'bg-orange-500' },
                  { name: 'Tax Set-Aside', value: totalTax, color: 'bg-yellow-500' },
                  { name: 'Skool', value: totalSkool, color: 'bg-blue-500' },
                  { name: 'Email Platform', value: totalEmail, color: 'bg-purple-500' },
                  { name: 'Misc Software', value: totalMisc, color: 'bg-pink-500' },
                ];
                
                return items.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>{formatCurrency(item.value)} ({((item.value / grandTotal) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`${item.color} h-2 rounded-full`} 
                        style={{ width: `${(item.value / grandTotal) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Monthly Expense Detail Table */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-400">Monthly Expense Detail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="p-2 text-left">Month</th>
                    <th className="p-2 text-right">Ad Spend</th>
                    <th className="p-2 text-right">Skool</th>
                    <th className="p-2 text-right">Email</th>
                    <th className="p-2 text-right">Misc</th>
                    <th className="p-2 text-right">Stripe</th>
                    <th className="p-2 text-right">Total Exp</th>
                    <th className="p-2 text-right">Tax</th>
                    <th className="p-2 text-right">Cash Out</th>
                    <th className="p-2 text-right">Revenue</th>
                    <th className="p-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => {
                    const skool = i >= 1 ? assumptions.skoolCost : 0;
                    const email = row.cumulativeLeads > 2500 ? assumptions.emailCost : 0;
                    const misc = i >= 1 ? assumptions.miscSoftware : 0;
                    const cashOut = row.totalExpenses + row.taxSetAside;
                    const margin = row.totalRevenue > 0 ? ((row.totalRevenue - cashOut) / row.totalRevenue * 100) : 0;
                    
                    return (
                      <tr key={i} className={`border-b border-gray-700 ${i === 11 ? 'bg-blue-900/30' : ''}`}>
                        <td className="p-2 font-semibold">{row.month}</td>
                        <td className="p-2 text-right text-red-400">{formatCurrency(row.adSpend)}</td>
                        <td className="p-2 text-right text-red-400">{formatCurrency(skool)}</td>
                        <td className="p-2 text-right text-red-400">{formatCurrency(email)}</td>
                        <td className="p-2 text-right text-red-400">{formatCurrency(misc)}</td>
                        <td className="p-2 text-right text-orange-400">{formatCurrency(row.stripeFees)}</td>
                        <td className="p-2 text-right text-red-400 font-semibold">{formatCurrency(row.totalExpenses)}</td>
                        <td className="p-2 text-right text-yellow-400">{formatCurrency(row.taxSetAside)}</td>
                        <td className="p-2 text-right text-red-400 font-bold">{formatCurrency(cashOut)}</td>
                        <td className="p-2 text-right text-green-400">{formatCurrency(row.totalRevenue)}</td>
                        <td className={`p-2 text-right font-semibold ${margin >= 50 ? 'text-green-400' : margin >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>{margin.toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Expense Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-400">{formatCurrency(data.reduce((s,m) => s + m.adSpend, 0))}</div>
              <div className="text-gray-400 text-sm">Total Ad Spend</div>
              <div className="text-gray-500 text-xs mt-1">{((data.reduce((s,m) => s + m.adSpend, 0) / year2Total.cumulativeRevenue) * 100).toFixed(1)}% of revenue</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">{formatCurrency(data.reduce((s,m) => s + m.totalPaymentFees, 0))}</div>
              <div className="text-gray-400 text-sm">Total Payment Fees</div>
              <div className="text-gray-500 text-xs mt-1">Stripe + Skool (2.9% each)</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">{formatCurrency(summaryStats.year1Tax + summaryStats.year2Tax)}</div>
              <div className="text-gray-400 text-sm">Total Tax Set-Aside</div>
              <div className="text-gray-500 text-xs mt-1">{assumptions.taxRate * 100}% of profit</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{formatCurrency(23 * (assumptions.skoolCost + assumptions.miscSoftware) + data.filter(m => m.cumulativeLeads > 2500).length * assumptions.emailCost)}</div>
              <div className="text-gray-400 text-sm">Total Software/Platform</div>
              <div className="text-gray-500 text-xs mt-1">Fixed monthly costs</div>
            </div>
          </div>

          {/* Profitability Analysis */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-400">Profitability Analysis</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Cost to Acquire Community Member</h4>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(data.reduce((s,m) => s + m.adSpend, 0) / (year2Total.communityMembers + year2Total.cumulativeTripwireBuyers))}
                </div>
                <div className="text-xs text-gray-500">Ad spend ÷ total buyers</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Avg Monthly Fixed Costs</h4>
                <div className="text-xl font-bold text-white">
                  {formatCurrency(assumptions.skoolCost + assumptions.emailCost + assumptions.miscSoftware)}
                </div>
                <div className="text-xs text-gray-500">Skool + Email + Misc</div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-400 mb-2">Break-Even MRR</h4>
                <div className="text-xl font-bold text-white">
                  {formatCurrency((assumptions.skoolCost + assumptions.emailCost + assumptions.miscSoftware) / 0.67)}
                </div>
                <div className="text-xs text-gray-500">To cover fixed costs after Stripe + tax</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'assumptions' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-blue-400">Pricing</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Tripwire Price</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.tripwirePrice}
                    onChange={(e) => setAssumptions({...assumptions, tripwirePrice: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Average Order Value</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.aov}
                    onChange={(e) => setAssumptions({...assumptions, aov: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Community Price</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.communityPrice}
                    onChange={(e) => setAssumptions({...assumptions, communityPrice: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Inner Circle Price</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.innerCirclePrice}
                    onChange={(e) => setAssumptions({...assumptions, innerCirclePrice: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">1:1 Intensive Price</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.oneOnOnePrice}
                    onChange={(e) => setAssumptions({...assumptions, oneOnOnePrice: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-green-400">Conversion Rates</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Landing Page → Lead</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.landingPageConv * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, landingPageConv: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Lead → Tripwire</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.leadToPurchase * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, leadToPurchase: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Buyer → Community</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.buyerToCommunity * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, buyerToCommunity: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Community → IC</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.communityToIC * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, communityToIC: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">IC → 1:1</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.icToOneOnOne * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, icToOneOnOne: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Community Churn</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.communityChurn * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, communityChurn: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">IC Churn</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.icChurn * 100).toFixed(1)}
                    onChange={(e) => setAssumptions({...assumptions, icChurn: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.5"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Costs</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Cost Per Click</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.cpc}
                    onChange={(e) => setAssumptions({...assumptions, cpc: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Skool (monthly)</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.skoolCost}
                    onChange={(e) => setAssumptions({...assumptions, skoolCost: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Email Platform (monthly)</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.emailCost}
                    onChange={(e) => setAssumptions({...assumptions, emailCost: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Misc Software (monthly)</label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-1">$</span>
                  <input
                    type="number"
                    value={assumptions.miscSoftware}
                    onChange={(e) => setAssumptions({...assumptions, miscSoftware: parseFloat(e.target.value) || 0})}
                    className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Tax Set-Aside Rate</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={(assumptions.taxRate * 100).toFixed(0)}
                    onChange={(e) => setAssumptions({...assumptions, taxRate: (parseFloat(e.target.value) || 0) / 100})}
                    className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right"
                  />
                  <span className="text-gray-500 ml-1">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Skool Total Fee</label>
                <span className="text-gray-400">5.8% + $0.30/txn</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 ml-4">
                <span>(2.9% Skool + 2.9% Stripe + $0.30)</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Stripe Fee (non-Skool)</label>
                <span className="text-gray-400">2.9% + $0.30/txn</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-purple-400">Quick Scenarios</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setAssumptions({...assumptions, 
                  landingPageConv: 0.40, leadToPurchase: 0.03, buyerToCommunity: 0.08,
                  communityToIC: 0.08, icToOneOnOne: 0.03, communityChurn: 0.08, icChurn: 0.05
                })}
                className="w-full bg-amber-700 hover:bg-amber-600 px-3 py-2 rounded text-left"
              >
                📊 Moderate (Middle Ground)
              </button>
              <button 
                onClick={() => setAssumptions({...assumptions, 
                  landingPageConv: 0.45, leadToPurchase: 0.04, buyerToCommunity: 0.10,
                  communityToIC: 0.10, icToOneOnOne: 0.04, communityChurn: 0.07, icChurn: 0.04
                })}
                className="w-full bg-green-700 hover:bg-green-600 px-3 py-2 rounded text-left"
              >
                🔺 Optimistic (Best Case)
              </button>
              <button 
                onClick={() => setAssumptions({...assumptions, communityPrice: 79, innerCirclePrice: 199})}
                className="w-full bg-purple-700 hover:bg-purple-600 px-3 py-2 rounded text-left"
              >
                💰 Premium Pricing ($79/$199)
              </button>
              <button 
                onClick={() => setAssumptions({...assumptions, communityChurn: 0.05, icChurn: 0.03})}
                className="w-full bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded text-left"
              >
                🔒 Low Churn (5%/3%)
              </button>
              <button 
                onClick={() => setAssumptions({...assumptions, communityChurn: 0.12, icChurn: 0.08})}
                className="w-full bg-red-700 hover:bg-red-600 px-3 py-2 rounded text-left"
              >
                🚪 High Churn (12%/8%)
              </button>
              <button 
                onClick={() => setAssumptions({...assumptions, cpc: 1.50, leadToPurchase: 0.05, buyerToCommunity: 0.12})}
                className="w-full bg-cyan-700 hover:bg-cyan-600 px-3 py-2 rounded text-left"
              >
                🇺🇸 US-Only Targeting
              </button>
              <button 
                onClick={resetDefaults}
                className="w-full bg-gray-600 hover:bg-gray-500 px-3 py-2 rounded text-left"
              >
                ↩️ Reset to Conservative (Default)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
