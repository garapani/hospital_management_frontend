const PHONE_PATTERN = /^[0-9]{10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Matches the backend's `@Matches(/^[0-9]{10}$/)` on CreatePatientDto/UpdatePatientDto.phoneNumber. */
export function isValidPhoneNumber(phoneNumber: string | undefined | null): boolean {
  return !phoneNumber || PHONE_PATTERN.test(phoneNumber);
}

/** Matches the backend's `@IsEmail()` on CreatePatientDto/UpdatePatientDto.email closely enough to catch typos before submit. */
export function isValidEmail(email: string | undefined | null): boolean {
  return !email || EMAIL_PATTERN.test(email);
}

export function calculateAge(dateOfBirth: string | undefined | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age--;

  return age >= 0 ? age : null;
}
