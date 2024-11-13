/*---------------------------------------------------------------*
 * YiktLLW .. 2025-03-21 .. Johannes Brahms
 * login.ts 为渲染进程中，处理登录状态的工具
 * 封装了以下功能：
 * 1. 获取登录信息(状态，用户ID，用户名，头像)
 * 2. 获取用户创建的歌单，用户收藏的歌单
 *---------------------------------------------------------------*/

import { Subscriber } from "@/utils/subscribe";
import { useApi } from "./api";
import { ref, reactive, markRaw, Ref, Raw, Reactive } from "vue";
import { UserPlaylist } from "@/dual/login";

export interface IPlaylist {
  name: string;
  label: string;
  id: number;
  img: string;
}

export class Login {
  /** 登录凭证 */
  _cookie: string = localStorage.getItem("login_cookie") ?? "";
  /** 登录状态 */
  _status: boolean = localStorage.getItem("login_cookie") ? true : false;
  /** 用户ID */
  _userId: string = localStorage.getItem("login_user_id") ?? "";
  /** 用户名 */
  _userName: string = localStorage.getItem("login_user_name") ?? "";
  /** 用户喜欢的音乐 */
  _likelist: Raw<number[]> = markRaw([]);
  /** 用户头像 */
  _avatar: string = localStorage.getItem("login_avatar") ?? "";
  /** 用户创建的歌单 */
  _userPlaylists: Reactive<IPlaylist[]> = reactive([]);
  /** 用户订阅的歌单 */
  _userSubscribes: Reactive<IPlaylist[]> = reactive([]);
  /** 订阅事件 */
  subscriber: Subscriber = markRaw(
    new Subscriber(["userPlaylists", "status", "userId", "userName", "avatar"]),
  );
  /** 每隔一段时间，自动更新用户的歌单 */
  interval: NodeJS.Timeout;
  _userFavoriteId: number = 0;
  constructor() {
    this.init();
    this.interval = setInterval(() => {
      if (this._cookie && this._userId) {
        this.refreshUserPlaylists();
      }
    }, 1000 * 100);
  }
  /** 初始化 */
  init() {
    if (this._cookie && (!this._userId || !this._userName || this._avatar)) {
      this.updateInfo();
    }
    if (!this._cookie) {
      this.clear();
    }
  }
  /** 更新信息 */
  async updateInfo() {
    // console.log('updateInfo');
    await useApi("/user/account", {
      cookie: this._cookie,
    })
      .then((res) => {
        this.userId = res.profile.userId;
        this.userName = res.profile.nickname;
        this.avatar = res.profile.avatarUrl + "?param=200y200";
      })
      .catch((error) => {
        console.log(error);
      });
    await this.reloadLikelist();
    await this.refreshUserPlaylists();
  }
  async logout() {
    if (this._cookie) {
      await useApi("/logout", {
        cookie: this._cookie,
      }).catch((error) => {
        console.error("Failed to logout:", error);
      });
    }
    this.clear();
    window.location.reload();
  }
  clear() {
    /** 使用_cookie是为了不触发window.location.reload() */
    this._cookie = "";
    localStorage.setItem("login_cookie", "");
    this.status = false;
    this._userId = "";
    this.userName = "";
    this._likelist = markRaw([]);
    this.avatar = "";
    this._userPlaylists = markRaw([]);
    this._userSubscribes = markRaw([]);
    this.subscriber.clear();
  }
  get cookie() {
    return this._cookie;
  }
  set cookie(value) {
    localStorage.setItem("login_cookie", value ?? "");
    this._cookie = value;
    this.status = true;
    this.updateInfo();
    window.location.reload();
  }
  get userId() {
    return this._userId;
  }
  private set userId(value) {
    if (value !== this._userId && value) {
      this._userId = value;
      localStorage.setItem("login_user_id", value.toString());
      this.subscriber.exec("userId");
    }
  }
  get userName() {
    return this._userName;
  }
  private set userName(value) {
    if (value !== this._userName && value) {
      this._userName = value;
      localStorage.setItem("login_user_name", value);
      this.subscriber.exec("userName");
    }
  }
  get likelist() {
    return this._likelist;
  }
  /** 重新加载用户喜欢的音乐 */
  async reloadLikelist() {
    if (!this._cookie) return;
    if (!this._userId) await this.updateInfo();
    useApi("/likelist", {
      cookie: this._cookie,
      uid: this._userId,
    })
      .then((res) => {
        this._likelist = markRaw(res.ids);
      })
      .catch((error) => {
        console.error("Failed to get likelist:", error);
      });
  }
  get status() {
    return this._status;
  }
  private set status(value) {
    if (typeof value === "boolean" && value !== this._status) {
      this._status = value;
      localStorage.setItem("login_status", value ? "true" : "false");
      this.subscriber.exec("status");
    }
  }
  get avatar() {
    return this._avatar;
  }
  private set avatar(value) {
    if (value !== this._avatar && value) {
      this._avatar = value;
      localStorage.setItem("login_avatar", value);
      this.subscriber.exec("avatar");
    }
  }
  get userPlaylists() {
    return this._userPlaylists;
  }
  get userSubscribes() {
    return this._userSubscribes;
  }
  get userFavoriteId() {
    return this._userFavoriteId;
  }
  /** 刷新用户的歌单 */
  async refreshUserPlaylists() {
    if (!this._cookie) {
      return;
    }
    if (!this._userId) {
      await this.updateInfo();
      if (!this._userId) return;
    }
    await useApi("/user/playlist", {
      uid: this._userId,
      cookie: this._cookie,
      timestamp: new Date().getTime(),
    })
      .then((res) => {
        this._userPlaylists = [];
        this._userSubscribes = [];
        res.playlist.forEach((playlist: UserPlaylist) => {
          if (!playlist.subscribed) {
            this._userPlaylists.push({
              name: playlist.name,
              label: playlist.name,
              id: playlist.id,
              img: playlist.coverImgUrl,
            });
          } else {
            this._userSubscribes.push({
              name: playlist.name,
              label: playlist.name,
              id: playlist.id,
              img: playlist.coverImgUrl,
            });
          }
        });
      })
      .catch((error) => {
        console.error("Failed to get user playlist:", error);
      });
    if (this.userPlaylists.length > 0) {
      this._userFavoriteId = this.userPlaylists[0].id;
      this.userPlaylists.splice(0, 1);
    }
    this.subscriber.exec("userPlaylists");
  }
}
