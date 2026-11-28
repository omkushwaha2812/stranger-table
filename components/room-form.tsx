import {act} from '@/app/dashboard/find/actions';
export function RoomForm({id,action,value,children}:{id:string;action:string;value?:string;children:React.ReactNode}) {
  return <form className="form-stack" action={act}><input type="hidden" name="id" value={id}/><input type="hidden" name="action" value={action}/>{value!==undefined && <input type="hidden" name="value" value={value}/>}<>{children}</></form>;
}
