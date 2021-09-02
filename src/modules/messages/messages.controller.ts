import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JoinRoomDto } from './dto/join-room.dto';
import { MessageDto } from './dto/message.dto';
import { PaginationQueryDto } from './dto/paginator.dto';
import { AuthGuard } from './guards/auth.guard';
import { MessagesService } from './messages.service';

@Controller('api/v1/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  joinRoom(@Body() joinRoomDto: JoinRoomDto) {
    return this.messagesService.joinRoom(joinRoomDto);
  }

  @Post('send')
  @UseGuards(AuthGuard)
  sendMessage(@Request() req, @Body('message') message: MessageDto) {
    const { username, roomId } = req;
    return this.messagesService.sendMessage(username, roomId, message);
  }

  @Get(':roomId')
  @UseGuards(AuthGuard)
  getMessages(
    @Param('roomId') roomId,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    return this.messagesService.getRoomMessages(roomId, paginationQuery);
  }

  @Post('leave')
  @UseGuards(AuthGuard)
  leaveRoom(@Request() req) {
    const { username, roomId } = req;
    return this.messagesService.leaveRoom(username, roomId);
  }
}
