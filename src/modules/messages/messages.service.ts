import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JoinRoomDto } from './dto/join-room.dto';
import { MessageDto } from './dto/message.dto';
import { PaginationQueryDto } from './dto/paginator.dto';
import { MessagesGateway } from './messages.gateway';
import { Message } from './schemas/message.schema';
import { Participant } from './schemas/participant.schema';
import { Room } from './schemas/room.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<Room>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(Participant.name)
    private readonly participantModel: Model<Participant>,
    private jwtService: JwtService,
    private readonly messageGateway: MessagesGateway,
  ) {}

  async joinRoom(joinRoomDto: JoinRoomDto) {
    const session = await this.roomModel.startSession();
    session.startTransaction();
    try {
      const isUsernameJoinedChatroom = await this.checkUsernameJoinedChatroom(
        joinRoomDto.username,
        joinRoomDto.roomId,
      );
      if (isUsernameJoinedChatroom) {
        throw new BadRequestException('Username already joined chatroom!');
      }
      // Find room
      let room = await this.roomModel.findOne(
        {
          roomId: joinRoomDto.roomId,
        },
        null,
        { session: session },
      );
      if (!room) {
        room = new this.roomModel({
          roomId: joinRoomDto.roomId,
        });
      }
      // Find user to add to onlineParticipany
      let user = await this.participantModel.findOne({
        username: joinRoomDto.username,
        roomId: joinRoomDto.roomId,
      });
      if (!user) {
        user = new this.participantModel({
          username: joinRoomDto.username,
          roomId: joinRoomDto.roomId,
        });
      }
      const jwtToken = this.jwtService.sign(
        {
          username: joinRoomDto.username,
          roomId: joinRoomDto.roomId,
        },
        {
          secret: process.env.JWT_SECRET,
        },
      );
      user.token = jwtToken;
      await user.save({ session });

      room.onlineParticipants.push(user);
      room.markModified('onlineParticipants');
      await room.save({ session });
      await session.commitTransaction();
      session.endSession();

      this.messageGateway.server.emit(`join_room_${joinRoomDto.roomId}`, {
        participant: user,
      });
      return user;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async leaveRoom(username: string, roomId: string) {
    const room = await this.roomModel.findOne({
      roomId,
    });
    const participantIndex = room.onlineParticipants.findIndex(
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
    this.messageGateway.server.emit(`leave_room_${roomId}`, {
      username,
    });
    return;
  }

  async sendMessage(username: string, roomId: string, message: MessageDto) {
    const session = await this.roomModel.startSession();
    session.startTransaction();
    try {
      const participant = await this.participantModel.findOne(
        {
          username,
        },
        null,
        {
          session,
        },
      );
      const newMessage = new this.messageModel({
        participant,
        content: message.content,
      });
      const room = await this.roomModel.findOne(
        {
          roomId,
        },
        null,
        {
          session,
        },
      );
      room.messages.push(newMessage);
      room.markModified('messages');
      await newMessage.save({
        session,
      });
      await room.save({
        session,
      });
      await session.commitTransaction();
      session.endSession();

      this.messageGateway.server.emit(`receive_message_${roomId}`, {
        username,
        message: newMessage,
      });

      return newMessage;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async checkUsernameJoinedChatroom(username: string, roomId: string) {
    const participant = await this.participantModel.findOne({
      roomId,
      username,
    });
    return !!participant?.token;
  }

  async getRoomMessages(roomId: string, paginationQuery: PaginationQueryDto) {
    const offset = paginationQuery.offset || 0;
    const limit = paginationQuery.limit || 15;

    const room = await this.roomModel
      .findOne(
        {
          roomId,
        },
        {
          messages: { $slice: [0, 15] },
        },
      )
      .sort({
        'messages.createdAt': 1,
      })
      .populate({
        path: 'messages',
        populate: {
          path: 'participant',
          select: 'username',
        },
      });
    return room;
  }
}
