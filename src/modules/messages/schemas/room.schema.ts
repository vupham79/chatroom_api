import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Message } from './message.schema';
import { Participant } from './participant.schema';

@Schema({
  timestamps: true,
})
export class Room extends Document {
  @Prop()
  roomId: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Message' }] })
  messages: Message[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Participant' }] })
  onlineParticipants: Participant[];
}

export const RoomSchema = SchemaFactory.createForClass(Room);
