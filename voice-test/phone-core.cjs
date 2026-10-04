function phoneNumber(value) {
  const number = String(value || '').trim();
  if (/^\+[1-9]\d{7,14}$/.test(number)) return number;
  if (/^91\d{10}$/.test(number)) return '+' + number;
  throw new Error('Use a complete number with country code.');
}
function callLimit(value = 300) {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 30 || seconds > 900) throw new Error('Phone test limit must be 30–900 seconds.');
  return seconds;
}
function answerXml(publicUrl, token, maxSeconds = 300) {
  const url = new URL(publicUrl);
  if (url.protocol !== 'https:' || !/^[a-zA-Z0-9]+$/.test(token)) throw new Error('Invalid public endpoint.');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" streamTimeout="${callLimit(maxSeconds)}">wss://${url.host}/media/${token}</Stream><Hangup/></Response>`;
}
function dialPayload({from, to, publicUrl, token, maxSeconds = 300}) {
  answerXml(publicUrl, token, maxSeconds);
  return {from:phoneNumber(from), to:phoneNumber(to), answer_url:publicUrl + '/answer/' + token, answer_method:'POST', hangup_url:publicUrl + '/status/' + token, hangup_method:'POST', time_limit:callLimit(maxSeconds), ring_timeout:30};
}
class ClosingGate {
  begin() { this.closing = true; }
  queued() { this.ready = true; }
  played(name) {
    if (!this.closing || !this.ready || this.finished || name !== 'goodbye') return false;
    this.finished = true; return true;
  }
}
module.exports = {phoneNumber, answerXml, dialPayload, ClosingGate, callLimit};
