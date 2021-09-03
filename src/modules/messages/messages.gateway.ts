import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Model } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { Participant } from './schemas/participant.schema';
import { Room } from './schemas/room.schema';

@WebSocketGateway({ cors: true })
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server;
  private logger: Logger = new Logger('AppGateway');

  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    @InjectModel(Participant.name)
    private readonly participantModel: Model<Participant>,
  ) {}

  users = {};

  afterInit(server: Server) {
    this.logger.log('Init AppGateway');
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const { username, roomId } = this.users[client.id];
    if (username && roomId) {
      const room = await this.roomModel
        .findOne({
          roomId,
        })
        .populate({
          path: 'onlineParticipants',
        });
      const participantIndex = room.onlineParticipants?.findIndex(
        (participant) => participant.username === username,
      );
      if (participantIndex > -1) {
        room.onlineParticipants.splice(participantIndex, 1);
        room.markModified('onlineParticipants');
        await room.save();
      }
      await this.participantModel.findOneAndUpdate(
        {
          username,
          roomId,
        },
        {
          token: null,
        },
      );
    }
    this.server.emit(`leave_room_${roomId}`, {
      username,
    });
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    this.users[client.id] = {};
  }

  @SubscribeMessage('identity')
  async onChat(client, message) {
    this.logger.log(
      `Client connected: ${message.username} at room ${message.roomId}`,
    );
    this.users[client.id] = {
      username: message.username,
      roomId: message.roomId,
    };
  }
}
