import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: true,
})
export class Participant extends Document {
  @Prop()
  username: string;

  @Prop()
  roomId: string;

  @Prop()
  token: string;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);
