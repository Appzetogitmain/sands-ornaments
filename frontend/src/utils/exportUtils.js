/**
 * Exports JSON data to a CSV file designed to open seamlessly in Microsoft Excel.
 * Uses a UTF-8 BOM prefix (\uFEFF) to ensure Excel displays special characters (such as currency symbols) correctly.
 *
 * @param {Array<Object>} data - The array of objects containing data rows.
 * @param {Array<string>} headers - The headers corresponding to the object keys.
 * @param {Array<string>} columnNames - The user-friendly label names to display in the header row.
 * @param {string} filename - The target filename (without .csv extension).
 */
export const exportToExcelCSV = (data, headers, columnNames, filename) => {
    if (!data || data.length === 0) return;

    // Header row
    const headerRow = columnNames.map(name => `"${String(name).replace(/"/g, '""')}"`).join(',');

    // Data rows
    const rows = data.map(item => {
        return headers.map(header => {
            // Retrieve value (support nested objects if needed, like bankAccount.bankName)
            let val = item;
            const parts = header.split('.');
            for (const part of parts) {
                val = val ? val[part] : '';
            }
            if (val === null || val === undefined) val = '';
            
            // Format arrays or objects
            if (typeof val === 'object') {
                if (val instanceof Date) {
                    val = val.toLocaleDateString();
                } else {
                    val = JSON.stringify(val);
                }
            }
            
            // Escape double quotes and wrap in quotes
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
    });

    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
