
import { format, subDays, addDays, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const KOREA_TIMEZONE = 'Asia/Seoul';

// Mockable getSubmissionDate
function getSubmissionDate(mockNow?: Date): string {
    const nowUTC = mockNow || new Date();
    const nowKST = toZonedTime(nowUTC, KOREA_TIMEZONE);
    const hour = nowKST.getHours();

    // 00:00 ~ 01:59 -> Yesterday
    if (hour < 2) {
        const yesterdayKST = subDays(nowKST, 1);
        return format(yesterdayKST, 'yyyy-MM-dd');
    }

    // 02:00 ~ 23:59 -> Today
    return format(nowKST, 'yyyy-MM-dd');
}

function canViewAllProfilesWithoutAuth(today: string, endDateStr: string): boolean {
    const todayDate = parseISO(today);
    const endDate = parseISO(endDateStr);

    if (isNaN(todayDate.getTime()) || isNaN(endDate.getTime())) return false;

    const startDate = addDays(endDate, 1);
    return todayDate >= startDate;
}

// Test Cases
console.log('--- Verification Start ---');

// Scenario 1: Current Time is Nov 22, 03:00 KST. Last Day (EndDate) was Nov 21.
// Expected: Access GRANTED.
const now1 = new Date('2025-11-22T03:00:00+09:00');
const endDate1 = '2025-11-21';
const submissionDate1 = getSubmissionDate(now1);
const access1 = canViewAllProfilesWithoutAuth(submissionDate1, endDate1);

console.log(`Scenario 1 (Now: ${format(now1, 'yyyy-MM-dd HH:mm')}, EndDate: ${endDate1})`);
console.log(`Submission Date: ${submissionDate1}`);
console.log(`Access Granted: ${access1}`); // Should be true

// Scenario 2: Current Time is Nov 22, 01:00 KST. Last Day (EndDate) was Nov 21.
// Expected: Access DENIED (Still considered Nov 21, which is the last day, but not AFTER the last day).
// Wait, if today is Nov 21 (due to < 2AM), and EndDate is Nov 21.
// canViewAllProfilesWithoutAuth checks today >= EndDate + 1.
// Nov 21 >= Nov 22 -> False.
const now2 = new Date('2025-11-22T01:00:00+09:00');
const endDate2 = '2025-11-21';
const submissionDate2 = getSubmissionDate(now2);
const access2 = canViewAllProfilesWithoutAuth(submissionDate2, endDate2);

console.log(`Scenario 2 (Now: ${format(now2, 'yyyy-MM-dd HH:mm')}, EndDate: ${endDate2})`);
console.log(`Submission Date: ${submissionDate2}`);
console.log(`Access Granted: ${access2}`); // Should be false

// Scenario 3: Current Time is Nov 22, 03:00 KST. Last Day (EndDate) is Nov 22.
// Expected: Access DENIED (Today is Nov 22. EndDate + 1 is Nov 23. Nov 22 < Nov 23).
const now3 = new Date('2025-11-22T03:00:00+09:00');
const endDate3 = '2025-11-22';
const submissionDate3 = getSubmissionDate(now3);
const access3 = canViewAllProfilesWithoutAuth(submissionDate3, endDate3);

console.log(`Scenario 3 (Now: ${format(now3, 'yyyy-MM-dd HH:mm')}, EndDate: ${endDate3})`);
console.log(`Submission Date: ${submissionDate3}`);
console.log(`Access Granted: ${access3}`); // Should be false

console.log('--- Verification End ---');
