import Observer from './reactivity/observer.js'
import Compile from './compile/index.js'

class Vue {
  constructor (option = {}) {
    this.$el = option.el;
    this.$data = option.data();
    this.$methods = option.methods;

    // data 做响应式处理
    new Observer(this.$data);

    if (this.$el) {
      new Compile(this.$el, this);
    }
  }
}

window.Vue = Vue
export default Vue
