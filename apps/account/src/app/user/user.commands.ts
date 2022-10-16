import { Body, Controller } from '@nestjs/common';
import { RMQRoute, RMQService, RMQValidate } from 'nestjs-rmq';
import { AccountBuyCourse, AccountChangeProfile, AccountCheckPayment } from '@microservice/contracts';
import { UserRepository } from './repositories';
import { UserEntity } from './entities';
import { BuyCourseSaga } from './sagas';
import { UserService } from './user.service';

@Controller()
export class UserCommands {
  constructor(private readonly userRepository: UserRepository, private readonly userService: UserService, private readonly rmqService: RMQService) {
  }

  @RMQValidate()
  @RMQRoute(AccountChangeProfile.topic)
  async changeProfile(@Body() dto: AccountChangeProfile.Request): Promise<AccountChangeProfile.Response> {
    // const existedUser = await this.userRepository.findUserById(id);
    // if (!existedUser) {
    //   throw new Error(`User ${id} does not exists in the database`);
    // }
    //
    // const userEntity = new UserEntity(existedUser).changeProfile(user);
    // await this.userRepository.changeProfile(userEntity);
    // return {};
    return this.userService.changeProfile(dto);
  }

  @RMQValidate()
  @RMQRoute(AccountBuyCourse.topic)
  async buyCourse(@Body() { userId, courseId }: AccountBuyCourse.Request): Promise<AccountBuyCourse.Response> {
    const existedUser = await this.userRepository.findUserById(userId);
    if (!existedUser) {
      throw new Error(`User ${userId} not found`);
    }
    const userEntity = new UserEntity(existedUser);
    const saga = new BuyCourseSaga(userEntity, courseId, this.rmqService);
    const { paymentLink, user } = await saga.getState().pay();
    await this.userRepository.changeProfile(user);
    return { paymentLink };
  }

  @RMQValidate()
  @RMQRoute(AccountCheckPayment.topic)
  async checkPayment(@Body() { userId, courseId }: AccountCheckPayment.Request): Promise<AccountCheckPayment.Response> {
    const existedUser = await this.userRepository.findUserById(userId);
    if (!existedUser) {
      throw new Error(`User ${userId} not found`);
    }
    const userEntity = new UserEntity(existedUser);
    const saga = new BuyCourseSaga(userEntity, courseId, this.rmqService);
    const { user, status } = await saga.getState().checkPayment();
    await this.userRepository.changeProfile(user);
    return { status };
  }
}
