/**
 * 설문 폼 유효성 검사 유틸리티
 */

/**
 * 휴대폰 번호 형식 검증 (010-xxxx-xxxx 또는 01012345678)
 */
export function isValidPhoneNumber(phone: string): boolean {
    // 숫자만 추출
    const digits = phone.replace(/\D/g, '');
    
    // 010으로 시작하고 총 11자리인지 확인
    if (digits.length !== 11 || !digits.startsWith('010')) {
        return false;
    }
    
    return true;
}

/**
 * 휴대폰 번호 포맷팅 (010-1234-5678 형식으로)
 */
export function formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length <= 3) {
        return digits;
    } else if (digits.length <= 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else {
        return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
    }
}

/**
 * 생년월일로부터 만 나이 계산
 * @param birthdate 8자리 생년월일 (예: 19950101)
 */
export function calculateAge(birthdate: string): number {
    if (birthdate.length !== 8) return 0;
    
    const year = parseInt(birthdate.slice(0, 4), 10);
    const month = parseInt(birthdate.slice(4, 6), 10);
    const day = parseInt(birthdate.slice(6, 8), 10);
    
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * 만 19세 이상인지 확인
 */
export function isAdult(birthdate: string): boolean {
    return calculateAge(birthdate) >= 19;
}

/**
 * 유효한 생년월일 형식인지 확인 (8자리, 실제 존재하는 날짜)
 */
export function isValidBirthdate(birthdate: string): boolean {
    if (birthdate.length !== 8) return false;
    
    const year = parseInt(birthdate.slice(0, 4), 10);
    const month = parseInt(birthdate.slice(4, 6), 10);
    const day = parseInt(birthdate.slice(6, 8), 10);
    
    // 기본 범위 검사
    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // 실제 날짜 유효성 검사
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
}

/**
 * 파일 크기 검증 (최대 20MB)
 */
export function isValidFileSize(file: File, maxSizeMB: number = 20): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}

/**
 * 이미지 파일 타입 검증
 * HEIC/HEIF (iPhone 기본 포맷) 지원 추가
 */
export function isValidImageType(file: File): boolean {
    const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
    ];
    return validTypes.includes(file.type);
}












