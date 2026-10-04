const test = require('node:test');
const assert = require('node:assert/strict');
const { detectPhotoType } = require('../domain/photoEvidence');

test('accepts only supported photo signatures, regardless of claimed MIME type', () => {
  assert.equal(detectPhotoType(Buffer.from([0xff,0xd8,0xff,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00])), 'image/jpeg');
  assert.equal(detectPhotoType(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x00])), 'image/png');
  assert.equal(detectPhotoType(Buffer.from('RIFF1234WEBP', 'ascii')), 'image/webp');
  assert.equal(detectPhotoType(Buffer.from('<svg onload=', 'ascii')), null);
  assert.equal(detectPhotoType(Buffer.from('%PDF-1.7 test', 'ascii')), null);
});
