/*
 * Dep 被观察者 - 收集依赖
 */
export default class Dep {
  constructor () {
    this.subs = [];
  }
  addSub (watcher) {
    this.subs.push(watcher);
  }
  notify () {
    this.subs.forEach(sub => {
      sub.update();
    });
  }
}