import { 
    collection, 
    doc,
    setDoc,
    serverTimestamp, 
    query, 
    orderBy, 
    onSnapshot,
    type DocumentData,
    type QuerySnapshot
} from 'firebase/firestore';
import { getDb } from './index';
import { COLLECTIONS, type MeetupMessage } from '@/types/database';

/**
 * 소셜링 채팅 메시지 전송
 */
export async function sendMeetupMessage(
    cohortId: string, 
    content: string, 
    author: { id: string; name: string; profileImage?: string },
    imageUrl?: string
): Promise<string> {
    try {
        const db = getDb();
        // 문서 ID를 "이름_타임스탬프" 형식으로 생성하여 가독성 확보 및 중복 방지
        const customDocId = `${author.name}_${Date.now()}`;
        const docRef = doc(db, COLLECTIONS.COHORTS, cohortId, COLLECTIONS.MEETUP_MESSAGES, customDocId);
        
        const messageData: Omit<MeetupMessage, 'id'> = {
            cohortId,
            content,
            authorId: author.id,
            authorName: author.name,
            authorProfileImage: author.profileImage || null,
            createdAt: serverTimestamp() as any,
            type: imageUrl ? 'image' : 'text',
            imageUrl: imageUrl || null
        };

        await setDoc(docRef, messageData);
        return customDocId;
    } catch (error) {
        console.error('Error sending meetup message:', error);
        throw error;
    }
}

/**
 * 소셜링 채팅 메시지 실시간 구독
 */
export function subscribeToMeetupMessages(
    cohortId: string, 
    onUpdate: (messages: MeetupMessage[]) => void
): () => void {
    const db = getDb();
    const collectionRef = collection(db, COLLECTIONS.COHORTS, cohortId, COLLECTIONS.MEETUP_MESSAGES);
    const q = query(collectionRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as MeetupMessage));
        
        onUpdate(messages);
    }, (error) => {
        console.error('Error subscribing to meetup messages:', error);
    });

    return unsubscribe;
}
