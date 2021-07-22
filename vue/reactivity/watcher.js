import Dep from "./dep.js";

/*
 * Watcher 观察者
 */
export default class Watcher {
  constructor (vm, key, cb) {
    this.vm = vm; // 当前实例
    this.key = key; // 当前作为观察者的数据
    this.cb = cb; // 数据发生改变后的回调

    Dep.target = this; // 全局变量

    // 通过取值触发响应式对象 data 中属性的 get，
    // 将当前属性对应的 Watcher(Dep.target) 添加进依赖收集器
    this.oldValue = this.vm.$data[key];

    Dep.target = null; // 清空，下一个观察者继续更新
  }

  update () {
    let oldValue = this.oldValue;
    let newValue = this.vm.$data[this.key]; // 从当前 vue 实例直接获取
    if (oldValue !== newValue) { // 再做判断
      this.cb(newValue, oldValue); // 通过回调函数直接更新
    }
  }
}