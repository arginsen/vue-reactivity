import Dep from "./dep.js";

export default class Observer {
  constructor (data) {
    this.data = data;
    this.walk(data);
  }

  // 仅对 data 做响应式处理，data 本身为对象，在此就不用区分对象/数组
  walk (data) {
    if (typeof data !== 'object') {
      return data;
    }
    Object.keys(data).forEach(index => {
      this.defineReactive(data, index, data[index]);
    })
  }

  defineReactive (obj, key, value) {
    this.walk(value);

    const dep = new Dep();
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get () {
        if (Dep.target) {
          dep.addSub(Dep.target);
        }
        return value;
      },
      set (newValue) {
        if (value === newValue) {
          return;
        }
        if (typeof newValue === 'object') {
          this.walk(newValue);
        }
        value = newValue;
        dep.notify(); // 执行被观察者的通知方法，通知所有观察者执行 update
      }
    })
  }
}