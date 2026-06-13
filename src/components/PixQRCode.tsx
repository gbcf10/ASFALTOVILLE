'use client';

import { useEffect, useState } from 'react';
import { generatePixPayload } from '@/lib/pix';

interface Props {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
}

export default function PixQRCode({ pixKey, merchantName, merchantCity, amount }: Props) {
  const [qrUrl, setQrUrl] = useState('');
  const [payload, setPayload] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!pixKey || amount <= 0) return;

    const code = generatePixPayload(pixKey, merchantName, merchantCity, amount);
    setPayload(code);

    import('qrcode').then(QRCode => {
      QRCode.toDataURL(code, {
        width: 220,
        margin: 2,
        color: { dark: '#166534', light: '#ffffff' },
      }).then(url => setQrUrl(url));
    });
  }, [pixKey, merchantName, merchantCity, amount]);

  async function copyPayload() {
    await navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!pixKey) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-500 text-sm">
        Chave PIX não configurada. Contate o síndico.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* QR Code */}
      <div className="flex justify-center">
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="QR Code PIX"
            className="w-48 h-48 rounded-xl border-4 border-brand-100"
          />
        ) : (
          <div className="w-48 h-48 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 text-sm animate-pulse">
            Gerando QR...
          </div>
        )}
      </div>

      {/* Dados do PIX */}
      <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 shrink-0">Chave:</span>
          <span className="font-mono font-bold text-gray-800 break-all">{pixKey}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-500 shrink-0">Beneficiário:</span>
          <span className="font-medium text-gray-700 text-right">{merchantName}</span>
        </div>
        <div className="flex justify-between gap-2 border-t pt-2 mt-1">
          <span className="text-gray-500 shrink-0">Valor:</span>
          <span className="font-bold text-brand-700 text-lg">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)}
          </span>
        </div>
      </div>

      {/* Copia e cola */}
      {payload && (
        <button
          onClick={copyPayload}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
            copied
              ? 'border-green-400 bg-green-50 text-green-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-brand-400 hover:text-brand-700'
          }`}
        >
          {copied ? '✓ Copiado!' : '📋 Copiar código PIX (Copia e Cola)'}
        </button>
      )}
    </div>
  );
}
