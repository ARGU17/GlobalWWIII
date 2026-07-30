export class NotificationService{
  constructor(eventBus){this.queue=[];eventBus.on("notification.created",event=>{this.queue.push(event.payload);if(this.queue.length>100)this.queue.shift()})}
  drain(){return this.queue.splice(0)}
}
