import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Participant } from './participant.schema';

@Schema({
  timestamps: true,
})
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Participant' })
  participant: Participant;

  @Prop()
  content: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
