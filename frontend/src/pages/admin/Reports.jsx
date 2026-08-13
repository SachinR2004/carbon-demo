import React from 'react';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';

export default function Reports() {
  const { token } = useAuth();
  
  const handleDownload = (type) => {
    // Native fetch so we can download blob
    fetch(`http://localhost:5000/api/v1/reports/export/${type}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Download failed');
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'pdf' ? 'gogreen_sustainability.pdf' : 'gogreen_fleet_report.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(() => alert('Failed to download report.'));
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <FileText size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-textMain">Reports & Exports</h1>
          <p className="text-sm text-neutral-textMuted">Download system data and sustainability metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="flex flex-col items-center text-center gap-4 p-8">
          <FileSpreadsheet size={48} className="text-eco" />
          <div>
            <h2 className="font-bold text-neutral-textMain">Raw Data Export</h2>
            <p className="text-sm text-neutral-textMuted mt-1">Excel format (.xlsx) containing all completed trips and raw metrics.</p>
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => handleDownload('excel')}>
            <Download size={16} className="mr-2" /> Download Excel
          </Button>
        </Card>

        <Card className="flex flex-col items-center text-center gap-4 p-8">
          <FileText size={48} className="text-danger" />
          <div>
            <h2 className="font-bold text-neutral-textMain">Executive Summary</h2>
            <p className="text-sm text-neutral-textMuted mt-1">PDF format summarizing total CO₂ savings and fleet health.</p>
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => handleDownload('pdf')}>
            <Download size={16} className="mr-2" /> Download PDF
          </Button>
        </Card>
      </div>
    </div>
  );
}
