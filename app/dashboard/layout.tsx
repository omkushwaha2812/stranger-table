import {requireStudent} from '@/lib/auth';
import {DashboardNav} from '@/components/dashboard-nav';
import {read} from '@/lib/store/db';
import {unreadChats, unreadNotifications} from '@/lib/store/core';
export default async function Layout({children}: {children: React.ReactNode}) {
  const {profile} = await requireStudent();

  const [unread, chats] = read(d => [unreadNotifications(d, profile.id), unreadChats(d, profile.id)]);
  return <div className="dash-layout"><DashboardNav unread={unread} chats={chats}/><main className="dash-main">{children}</main></div>;
}
