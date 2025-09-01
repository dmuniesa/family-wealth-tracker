import type { WeeklyReportData } from '../weekly-report-service';

export interface EmailTemplateOptions {
  locale: 'en' | 'es';
  includeCharts: boolean;
  customMessage?: string;
}

export class WeeklyReportTemplate {
  
  static generate(data: WeeklyReportData, options: EmailTemplateOptions): { subject: string; html: string; text: string } {
    const { locale, includeCharts, customMessage } = options;
    const t = locale === 'es' ? spanishTranslations : englishTranslations;
    
    const subject = `${data.familyName} - ${t.weeklyReport} (${data.period.start} - ${data.period.end})`;
    
    const html = this.generateHTML(data, t, includeCharts, customMessage);
    const text = this.generateText(data, t, customMessage);
    
    return { subject, html, text };
  }

  private static generateHTML(
    data: WeeklyReportData, 
    t: TranslationStrings, 
    includeCharts: boolean,
    customMessage?: string
  ): string {
    const { summary, accounts, period, familyName } = data;
    
    const netWorthChangeColor = summary.weekOverWeekChange >= 0 ? '#10b981' : '#ef4444';
    const netWorthChangeIcon = summary.weekOverWeekChange >= 0 ? '↗️' : '↘️';
    
    return `
<!DOCTYPE html>
<html lang="${t.locale}" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.weeklyReport}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      background-color: #f9fafb;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .period {
      margin-top: 8px;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 32px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .summary-card.highlight {
      background: linear-gradient(135deg, #fef3c7 0%, #fef9e7 100%);
      border-color: #f59e0b;
    }
    .summary-title {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 500;
    }
    .summary-amount {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .summary-change {
      font-size: 14px;
      font-weight: 600;
    }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .debt-amount { color: #dc2626; }
    .accounts-section {
      margin-top: 32px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    .account-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .account-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      font-size: 14px;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
    }
    .account-table td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .account-table tr:hover {
      background: #fafbfc;
    }
    .category-banking { border-left: 4px solid #3b82f6; }
    .category-investment { border-left: 4px solid #10b981; }
    .category-debt { border-left: 4px solid #dc2626; }
    .custom-message {
      background: #f0f9ff;
      border: 1px solid #7dd3fc;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      color: #0369a1;
    }
    .footer {
      background: #f8fafc;
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .unsubscribe {
      margin-top: 16px;
    }
    .unsubscribe a {
      color: #6366f1;
      text-decoration: none;
    }
    @media (max-width: 480px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
      .account-table {
        font-size: 12px;
      }
      .account-table th,
      .account-table td {
        padding: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>${familyName}</h1>
      <div class="period">${t.weeklyReport} • ${this.formatWeekPeriod(period.start, period.end, t)}</div>
    </div>

    <div class="content">
      <!-- Custom Message -->
      ${customMessage ? `
        <div class="custom-message">
          <strong>${t.personalNote}:</strong> ${customMessage}
        </div>
      ` : ''}

      <!-- Summary Grid -->
      <div class="summary-grid">
        <div class="summary-card">
          <div class="summary-title">${t.banking}</div>
          <div class="summary-amount">€${summary.totalBanking.toLocaleString()}</div>
        </div>
        
        <div class="summary-card">
          <div class="summary-title">${t.investments}</div>
          <div class="summary-amount">€${summary.totalInvestment.toLocaleString()}</div>
        </div>
        
        <div class="summary-card">
          <div class="summary-title">${t.debt}</div>
          <div class="summary-amount debt-amount">€${summary.totalDebt.toLocaleString()}</div>
        </div>
        
        <div class="summary-card highlight">
          <div class="summary-title">${t.netWorth}</div>
          <div class="summary-amount">€${summary.netWorth.toLocaleString()}</div>
          <div class="summary-change ${summary.weekOverWeekChange >= 0 ? 'positive' : 'negative'}">
            ${netWorthChangeIcon} €${Math.abs(summary.weekOverWeekChange).toLocaleString()} 
            (${summary.weekOverWeekPercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      <!-- Accounts Section -->
      <div class="accounts-section">
        <h2 class="section-title">${t.accountDetails}</h2>
        
        ${this.generateAccountsTable(accounts, t)}
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>${t.generatedAt}: ${new Date(data.generatedAt).toLocaleDateString(t.locale === 'es' ? 'es-ES' : 'en-US')}</div>
      <div style="margin-top: 8px;">${t.fromApp}</div>
      <div class="unsubscribe">
        <a href="#unsubscribe">${t.unsubscribe}</a>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private static generateAccountsTable(accounts: any[], t: TranslationStrings): string {
    if (accounts.length === 0) {
      return `<p style="color: #64748b; font-style: italic;">${t.noAccounts}</p>`;
    }

    const groupedAccounts = accounts.reduce((groups, account) => {
      const category = account.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push(account);
      return groups;
    }, {} as Record<string, any[]>);

    let html = '';
    
    Object.entries(groupedAccounts).forEach(([category, categoryAccounts]) => {
      const categoryName = t.categories[category as keyof typeof t.categories] || category;
      const categoryClass = `category-${category.toLowerCase()}`;
      
      html += `
        <h3 style="color: #475569; font-size: 16px; margin: 24px 0 12px 0;">${categoryName}</h3>
        <table class="account-table">
          <thead>
            <tr>
              <th>${t.accountName}</th>
              <th>${t.currency}</th>
              <th style="text-align: right;">${t.currentBalance}</th>
              <th style="text-align: right;">${t.weekChange}</th>
            </tr>
          </thead>
          <tbody>
            ${categoryAccounts.map(account => `
              <tr class="${categoryClass}">
                <td><strong>${account.name}</strong></td>
                <td>${account.currency}</td>
                <td style="text-align: right; font-weight: 600;">
                  ${account.currency} ${account.currentBalance.toLocaleString()}
                </td>
                <td style="text-align: right;" class="${account.weekChange >= 0 ? 'positive' : 'negative'}">
                  ${account.weekChange >= 0 ? '+' : ''}${account.currency} ${account.weekChange.toLocaleString()}
                  <br><small>(${account.weekChangePercentage.toFixed(2)}%)</small>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    });

    return html;
  }

  private static generateText(data: WeeklyReportData, t: TranslationStrings, customMessage?: string): string {
    const { summary, accounts, period, familyName } = data;
    
    let text = `${familyName} - ${t.weeklyReport}\n`;
    text += `${t.period}: ${this.formatWeekPeriod(period.start, period.end, t)}\n\n`;
    
    if (customMessage) {
      text += `${t.personalNote}: ${customMessage}\n\n`;
    }
    
    text += `${t.summary}:\n`;
    text += `• ${t.banking}: €${summary.totalBanking.toLocaleString()}\n`;
    text += `• ${t.investments}: €${summary.totalInvestment.toLocaleString()}\n`;
    text += `• ${t.debt}: €${summary.totalDebt.toLocaleString()}\n`;
    text += `• ${t.netWorth}: €${summary.netWorth.toLocaleString()}`;
    
    if (summary.weekOverWeekChange !== 0) {
      text += ` (${summary.weekOverWeekChange >= 0 ? '+' : ''}€${summary.weekOverWeekChange.toLocaleString()}, ${summary.weekOverWeekPercentage.toFixed(2)}%)\n\n`;
    } else {
      text += '\n\n';
    }
    
    text += `${t.accountDetails}:\n`;
    accounts.forEach(account => {
      text += `• ${account.name} (${account.category}): ${account.currency} ${account.currentBalance.toLocaleString()}`;
      if (account.weekChange !== 0) {
        text += ` (${account.weekChange >= 0 ? '+' : ''}${account.currency} ${account.weekChange.toLocaleString()})`;
      }
      text += '\n';
    });
    
    text += `\n${t.generatedAt}: ${new Date(data.generatedAt).toLocaleDateString()}\n`;
    text += `${t.fromApp}`;
    
    return text;
  }

  private static formatWeekPeriod(start: string, end: string, t: TranslationStrings): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    
    const locale = t.locale === 'es' ? 'es-ES' : 'en-US';
    
    return `${startDate.toLocaleDateString(locale, options)} - ${endDate.toLocaleDateString(locale, options)}`;
  }
}

interface TranslationStrings {
  locale: string;
  weeklyReport: string;
  period: string;
  summary: string;
  banking: string;
  investments: string;
  debt: string;
  netWorth: string;
  accountDetails: string;
  accountName: string;
  currency: string;
  currentBalance: string;
  weekChange: string;
  personalNote: string;
  generatedAt: string;
  fromApp: string;
  unsubscribe: string;
  noAccounts: string;
  categories: {
    Banking: string;
    Investment: string;
    Debt: string;
  };
}

const englishTranslations: TranslationStrings = {
  locale: 'en',
  weeklyReport: 'Weekly Financial Report',
  period: 'Period',
  summary: 'Financial Summary',
  banking: 'Banking Accounts',
  investments: 'Investment Accounts', 
  debt: 'Debt Accounts',
  netWorth: 'Net Worth',
  accountDetails: 'Account Details',
  accountName: 'Account Name',
  currency: 'Currency',
  currentBalance: 'Current Balance',
  weekChange: 'Week Change',
  personalNote: 'Personal Note',
  generatedAt: 'Generated on',
  fromApp: 'Family Wealth Tracker',
  unsubscribe: 'Unsubscribe from weekly reports',
  noAccounts: 'No accounts found for this family.',
  categories: {
    Banking: 'Banking',
    Investment: 'Investments',
    Debt: 'Debt'
  }
};

const spanishTranslations: TranslationStrings = {
  locale: 'es',
  weeklyReport: 'Resumen Financiero Semanal',
  period: 'Período',
  summary: 'Resumen Financiero',
  banking: 'Cuentas Bancarias',
  investments: 'Cuentas de Inversión',
  debt: 'Cuentas de Deuda',
  netWorth: 'Patrimonio Neto',
  accountDetails: 'Detalles de Cuentas',
  accountName: 'Nombre de Cuenta',
  currency: 'Moneda',
  currentBalance: 'Balance Actual',
  weekChange: 'Cambio Semanal',
  personalNote: 'Nota Personal',
  generatedAt: 'Generado el',
  fromApp: 'Family Wealth Tracker',
  unsubscribe: 'Darse de baja de los reportes semanales',
  noAccounts: 'No se encontraron cuentas para esta familia.',
  categories: {
    Banking: 'Bancario',
    Investment: 'Inversiones',
    Debt: 'Deuda'
  }
};