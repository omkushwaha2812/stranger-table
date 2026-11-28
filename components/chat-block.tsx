import {tableAction} from '@/app/dashboard/actions';
export function ChatBlock({peer}:{peer:string}){
 return <form action={tableAction}><input type="hidden" name="id" value={peer}/><input type="hidden" name="action" value="block"/><input type="hidden" name="from" value="messages"/><button className="secondary">Block user</button></form>;
}
