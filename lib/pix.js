function emv(id, value) {
  return `${id}${value.length.toString().padStart(2, '0')}${value}`;
}

function crc16(str) {
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

function removeAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function generatePixPayload(pixKey, merchantName, merchantCity, amount) {
  const name = removeAccents(merchantName).substring(0, 25).trim();
  const city = removeAccents(merchantCity || 'Brasil').substring(0, 15).trim();
  const merchantAccount = emv('00', 'BR.GOV.BCB.PIX') + emv('01', pixKey);
  let payload = '';
  payload += emv('00', '01');
  payload += emv('26', merchantAccount);
  payload += emv('52', '0000');
  payload += emv('53', '986');
  payload += emv('54', amount.toFixed(2));
  payload += emv('58', 'BR');
  payload += emv('59', name);
  payload += emv('60', city);
  payload += emv('62', emv('05', '***'));
  payload += '6304';
  return payload + crc16(payload);
}

module.exports = { generatePixPayload };
