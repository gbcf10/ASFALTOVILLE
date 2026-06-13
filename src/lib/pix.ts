function emv(id: string, value: string): string {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function removeAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function generatePixPayload(
  pixKey: string,
  merchantName: string,
  merchantCity: string,
  amount: number
): string {
  const name = removeAccents(merchantName).substring(0, 25).trim();
  const city = removeAccents(merchantCity || 'Brasil').substring(0, 15).trim();

  const merchantAccount = emv('00', 'BR.GOV.BCB.PIX') + emv('01', pixKey);

  let payload = '';
  payload += emv('00', '01');                          // Payload Format Indicator
  payload += emv('26', merchantAccount);               // Merchant Account Info (PIX)
  payload += emv('52', '0000');                        // Merchant Category Code
  payload += emv('53', '986');                         // Currency (BRL)
  payload += emv('54', amount.toFixed(2));             // Transaction Amount
  payload += emv('58', 'BR');                          // Country Code
  payload += emv('59', name);                          // Merchant Name
  payload += emv('60', city);                          // Merchant City
  payload += emv('62', emv('05', '***'));              // Additional Data (txid)
  payload += '6304';                                   // CRC placeholder

  return payload + crc16(payload);
}
