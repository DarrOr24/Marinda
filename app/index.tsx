// app/index.tsx
import { useAuthContext } from '@/hooks/use-auth-context';
import { Redirect } from 'expo-router';

export default function Index() {
    const { member, familyMembers } = useAuthContext() as any;

    // Still loading?
    if (!member) return null;

    const isChild = member.role === 'child' || member.role === 'teen';

    // Kids go directly to THEIR profile
    if (isChild) {
        return <Redirect href={`/profile/${member.id}`} />;
    }

    // Parents → find first child profile
    const firstKid = familyMembers?.find(
        (m: any) => m.role === 'child' || m.role === 'teen'
    );

    const targetId = firstKid?.id || member.id;

    return <Redirect href={`/profile/${targetId}`} />;
}
