import test from "node:test";
import assert from "node:assert/strict";

import {
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  isEncryptedValue,
} from "@/lib/encryption";
import {
  decryptPatientSensitiveFields,
  encryptPatientSensitiveFields,
} from "@/services/patientService";

const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

test("encryptString/decryptString round-trip with AAD", () => {
  const ciphertext = encryptString("hello-world", TEST_KEY, "clinic-a:phone");
  assert.equal(isEncryptedValue(ciphertext), true);
  assert.notEqual(ciphertext.includes("hello-world"), true);
  const plaintext = decryptString(ciphertext, TEST_KEY, "clinic-a:phone");
  assert.equal(plaintext, "hello-world");
});

test("AES-GCM encryption uses random IVs (non-deterministic output)", () => {
  const a = encryptString("same-value", TEST_KEY, "clinic-a:allergies");
  const b = encryptString("same-value", TEST_KEY, "clinic-a:allergies");
  assert.notEqual(a, b);
});

test("decryptString rejects tampered payload", () => {
  const ciphertext = encryptString("sensitive", TEST_KEY, "clinic-a:phone");
  const parts = ciphertext.split(":");
  parts[4] = parts[4].slice(0, -1) + (parts[4].endsWith("A") ? "B" : "A");
  assert.throws(
    () => decryptString(parts.join(":"), TEST_KEY, "clinic-a:phone"),
    /Unsupported state|authenticate|auth/i,
  );
});

test("encryptJson/decryptJson round-trip object payload", () => {
  const payload = { before: { phone: "123" }, after: { phone: "456" } };
  const encrypted = encryptJson(payload, TEST_KEY, "clinic-a:audit");
  const decrypted = decryptJson<typeof payload>(encrypted, TEST_KEY, "clinic-a:audit");
  assert.deepEqual(decrypted, payload);
});

test("patientService encrypts only sensitive patient fields and preserves others", () => {
  const input = {
    phone: "+63 912 345 6789",
    allergies: "Peanuts",
    notes: "Visible to staff",
    dateOfBirth: "1990-01-02",
  };

  const encrypted = encryptPatientSensitiveFields("clinic-a", input, TEST_KEY);
  assert.equal(typeof encrypted.phone, "string");
  assert.equal(isEncryptedValue(encrypted.phone), true);
  assert.equal(isEncryptedValue(encrypted.allergies), true);
  assert.equal(encrypted.notes, "Visible to staff");
  assert.equal(isEncryptedValue(encrypted.dateOfBirth), true);

  const decrypted = decryptPatientSensitiveFields("clinic-a", encrypted, TEST_KEY);
  assert.equal(decrypted.phone, input.phone);
  assert.equal(decrypted.allergies, input.allergies);
  assert.equal(decrypted.notes, input.notes);
  assert.equal(decrypted.dateOfBirth, input.dateOfBirth);
});

test("patientService decryption rejects wrong tenant AAD", () => {
  const encrypted = encryptPatientSensitiveFields(
    "clinic-a",
    { phone: "+63 912 345 6789" },
    TEST_KEY,
  );

  assert.throws(
    () => decryptPatientSensitiveFields("clinic-b", encrypted, TEST_KEY),
    /Unsupported state|authenticate|auth/i,
  );
});
