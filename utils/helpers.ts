import { Gig, GigStatus } from '../types';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
};

export const formatDate = (dateString: string): string => {
  if (!dateString || !dateString.includes('-')) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}.${month}.${year}`;
};

export const getMonthYear = (date: Date): string => {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export const getMonthHebrew = (date: Date): string => {
  const monthName = date.toLocaleString('he-IL', { month: 'long' });
  const monthNumber = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${monthName} (${monthNumber}) ${year}`;
};


export const isOverdue = (gig: Gig): boolean => {
  return gig.status === GigStatus.Pending && new Date(gig.paymentDueDate) < new Date() && !isToday(new Date(gig.paymentDueDate));
};

const isToday = (someDate: Date): boolean => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const checkDate = new Date(someDate);
    checkDate.setHours(0,0,0,0);
    return checkDate.getTime() === today.getTime();
}

export const generateCsv = (gigs: Gig[]): string => {
  const headers = ['id', 'name', 'supplierName', 'paymentAmount', 'eventDate', 'paymentDueDate', 'status', 'createdAt', 'invoiceNumber', 'notes'];
  const csvRows = [headers.join(',')];
  for (const gig of gigs) {
    const values = headers.map(header => {
      const val = gig[header as keyof Gig];
      // Handle potential commas in string values by quoting and escaping existing quotes
      if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
};

export const parseCsv = (csvText: string): Gig[] => {
    const lines = csvText.trim().replace(/\r\n/g, '\n').split('\n');
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
        const fields: string[] = [];
        let currentField = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i+1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote (escaped quote)
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField);
        return fields;
    };

    const headers = parseLine(lines[0]).map(h => h.trim());
    const gigs: Gig[] = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseLine(lines[i]);
        const gigData: any = {};

        headers.forEach((header, index) => {
            let value: any = values[index] || '';
            
            if (header === 'paymentAmount') {
                value = parseFloat(value) || 0;
            } else if (header === 'status' && !Object.values(GigStatus).includes(value as GigStatus)) {
                value = GigStatus.Pending;
            } else if (header === 'attachments') {
                // Attachments are not part of CSV, so skip this header
                return;
            }
            
            gigData[header] = value;
        });

        // Basic validation to ensure essential fields are present
        if (gigData.id && gigData.name && gigData.eventDate) {
            gigData.attachments = []; // Attachments are not in CSV, initialize as empty array
            gigs.push(gigData as Gig);
        }
    }
    return gigs;
};

const holidays: { [year: number]: { [date: string]: string } } = {
    2024: {
        '2024-04-23': 'פסח',
        '2024-04-29': 'שביעי של פסח',
        '2024-05-14': 'יום העצמאות',
        '2024-06-12': 'שבועות',
        '2024-10-03': 'ראש השנה',
        '2024-10-04': 'ראש השנה',
        '2024-10-12': 'יום כיפור',
        '2024-10-17': 'סוכות',
        '2024-10-24': 'שמחת תורה',
    },
    2025: {
        '2025-04-13': 'פסח',
        '2025-04-19': 'שביעי של פסח',
        '2025-05-01': 'יום העצמאות',
        '2025-06-02': 'שבועות',
        '2025-09-23': 'ראש השנה',
        '2025-09-24': 'ראש השנה',
        '2025-10-02': 'יום כיפור',
        '2025-10-07': 'סוכות',
        '2025-10-14': 'שמחת תורה',
    },
    2026: {
        '2026-04-02': 'פסח',
        '2026-04-08': 'שביעי של פסח',
        '2026-04-22': 'יום העצמאות',
        '2026-05-22': 'שבועות',
        '2026-09-12': 'ראש השנה',
        '2026-09-13': 'ראש השנה',
        '2026-09-21': 'יום כיפור',
        '2026-09-26': 'סוכות',
        '2026-10-03': 'שמחת תורה',
    },
};

export const getHolidaysForYear = (year: number): Map<string, string> => {
    return new Map(Object.entries(holidays[year] || {}));
};
