import task from '@/data/shinkansen-machine.json';
export {task};
export type Booking={origin:string;destination:string;train:string;seat:string;method:string;prepared:boolean;platform:string;car:string};
export const blankBooking:Booking={origin:'',destination:'',train:'',seat:'',method:'',prepared:false,platform:'',car:''};
export function checkBooking(step:number,b:Booking):string|null{
 if(step===0)return b.origin==='東京'&&b.destination==='京都'?null:'重新核对任务的出发站与目的地。';
 const train=task.trains.find(t=>t.id===b.train);
 if(!train)return '请先选择列车。';
 if(step===1){if(train.departMinutes<task.clock)return '这班车已经发车，请选择尚未发车的列车。';if(train.arriveMinutes>task.deadline)return '这班列车无法在任务要求的时间前到达。';if(!train.baggage)return '这班列车普通座位有空位，但特大行李空间附带座席已满。请重新选车。';return null;}
 if(step===2){if(!/^\d{2}[A-E]$/.test(b.seat)||task.occupied.includes(b.seat)||!task.seatRows.includes(Number(b.seat.slice(0,-1))))return '请选择可用座位。';if(Number(b.seat.slice(0,-1))!==task.baggageRow)return '此练习中该座位不附带特大行李空间，请核对座位说明。';if(!/[AE]$/.test(b.seat))return '座位可以容纳行李，但不符合本次靠窗的需求。';return null;}
 if(step===3){if(!['paper','ic'].includes(b.method))return '请选择本次练习支持的纸票或已关联预约的交通IC。';return b.prepared?null:b.method==='ic'?'仅持有IC卡还不够，请完成本次预约的乘车用IC指定。':'纸票乘车需要先领取车票。';}
 if(step===4)return b.platform===train.platform&&b.car===train.car?null:'站台与车厢是两个不同编号，请重新核对模拟预约信息。';
 return '未知的训练步骤。';
}
