# vue-reactivity

模拟简单的响应式实现

# tips

因为本例 index.html 书写直接引入书写的响应式 vue 模块，因此调试打开 index.html 需要启用本地服务器

可以采用 http-server 或者 live-server 插件

# notes

跟着调试再走一遍，从初始化 -> 数据变更 -> 响应式修改，文章从上至下浏览即可

# 初始化流程

## vue/index.js

定义 Vue 类

1. 通过我们例子 index.js 中先 new Vue 来初始化一个 vue 实例。
2. 此文件中定义了 Vue 类，将参数中的元素节点、数据、方法作以存储。
3. 对 data 数据做响应式处理，使用 Observer 来处理数据拦截
4. 如果当前 vue 实例存在传入的节点那么就进行编译（子实例初始化则跳过）
5. 将 Vue 类挂载在 windows ，最后以模块的形式导出 Vue

```js
// vue/index.js

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
```

## vue/reactivity/observer.js

定义 Observer 类，主要实现数据的遍历与属性拦截

1. 默认的 constructor 函数接收 new 实例时传入的待拦截数据，实例化时保存数据，执行 walk 遍历 data
2. walk 方法判断如果 data 不为对象直接返回（针对对象里的原始值），仅对对象的属性做响应式处理。接着用 Object.key() 将 data 的所有属性放进数组，遍历，执行属性响应式拦截处理
3. defineReactive 方法也是响应式的核心，首先对遍历的属性对应的值进行 walk 方法处理，如为对象则递归处理；
4. 再是创建 dep 实例，作为当前属性的依赖收集器，也是被观察者；
5. 接着是 vue2 响应式核心的实现  Object.defineProperty 方法，用来对传入的对象的指定属性做限定，定义该属性可枚举、可配置，同时对该属性的 get 和 set 方法重新书写。
6. 当前属性被 get 时，判断当前全局的 Dep.target（当前 dep 对应的观察者`[watcher]`） 是否存在，如存在则将该观察者存入当前依赖收集组（也就是一个被观察者 dep 存在多个观察者）；若不存在则直接返回当前该属性对应的值（键值对）。
7. 当前属性被重新设定时，也作以拦截，如果新设的值无变动则返回；若新值变成对象了（注意之前设置的属性必定对应的值为原始类型），则对该新值走一遍 walk，继续给安排响应式；接着更新当前属性的值为新设定的值，再通过依赖收集器 dep 通知各观察者们该更新到具体位置啦
8. 当然此时 get 和 set 均不会执行

```js
// vue/reactivity/observer.js

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
```

## vue/compile/index.js

经过上述步骤，完成数据拦截后，初始化 Vue 的操作就又回到 Vue 类本身，往下接着判断是否用户传入的配置中有元素节点 el ，进而执行编译工作，也就是把书写的 html 挂载到 dom 上去

1. 将传入的元素节点和 vue 实例存储，通过查找将元素节点（传入的时字符串）转换成 dom 中的 node 节点，也允许用户直接传 node 节点
2. 判断该 node 节点是否存在，存在则继续进行三个步骤，编译就完事了
3. 第一个步骤是将元素节点 el 中的所有节点放到 fragment 中，通过 document 创建文档碎片对象，再将元素节点 el 的所有子节点 childNodes 转化成数组对象，进行遍历，将每个子节点添加到创建的 fragment 碎片下，再返回碎片
4. 接着编译文档碎片，将文档碎片下的所有子节点遍历，判断每个子节点类型，如果为元素节点，就按元素节点的方法处理，如果为文本节点，则按文本节点方法处理，最后再判断当前子节点是否还有子节点，如有则递归调用编译处理
5. 接着来说元素节点的处理方法。如果为元素节点，再获取当前元素节点的所有属性 attributes ，然后遍历，看是否有属性为 vue 特定的属性，如 'v-model'、'v-text' 等，还有特定的语法，如 'v-bind:' 直接写出 ':'，再 'v-on:' 写成 '@'，可以用正则进行校验。
6. 此次例子中举的是文本节点，通过 nodeType 判断为 3 ，就解析该节点，将文本中的
`{{ }}` 包裹的变量用正则获取变量，从当前实例 vm.$data 中获取该变量数据，此次为首次触发该数据的 get，全局 Dep.target 不存在所以直接返回 value。接着新增一个观察者 Watcher ，观察此数据的变动。
7. 此时解析完成，执行第三步，把 fragment 碎片插入到根元素节点 el ，整个初始化完成

```js
// vue/compile/index.js

import Watcher from "../reactivity/watcher.js"

// 专门负责解析模板内容
export default class Compile {
	/**
	 * @param {} 传递的选择器
	 * @param {} Vue实例
	 */
	constructor(el, vm) {
		// 如果用户直接给 el 赋值了一个 DOM 对象，这样也可以
		this.el = typeof el === 'string' ? document.querySelector(el) : el
		this.vm = vm

		// 编译模板内容（把插值表达式，指令都替换）
		if (this.el) {

			// 1.把el中所有的节点放到 fragment（文档碎片）
			let fragment = this.node2fragment(this.el)

			// 2.编译 fragment
			this.compile(fragment)

			// 3.把 fragment 的内容一次放到 DOM 中
			this.el.appendChild(fragment)
		}
	}

	/** 核心方法 */

	// 把我们的节点，转为 代码片段
	node2fragment(el) {

		let fragment = document.createDocumentFragment()

		// 把el中所有的子节点 挨个添加到 文档碎片中
		let childNodes = el.childNodes // 类数组
		Utils.toArray(childNodes).forEach(item => {
			fragment.appendChild(item) // 把el中所有的子节点 挨个添加到 文档碎片中
		})
		return fragment

	}

	/**
	 * 编译文档碎片
	 * @param {*} fragment 
	 */
	compile(fragment) {
		let childNodes = fragment.childNodes // 拿到所有的子节点
		Utils.toArray(childNodes).forEach(node => {

			// 如果是 元素（标签），需要解析指令
			if (Utils.isElementNode(node)) {
				Utils.compileElement(node) // 解析元素（标签）节点
			}

			// 如果是文本节点，需要解析 插值表达式
			if (Utils.isTextNode(node)) {
				this.compileText(node) // 解析文本节点
			}

			// 如果当前节点还有子节点的时候，需要递归的判断
			if (node.childNodes && node.childNodes.length > 0) {
				this.compile(node)
			}

		})
	}

	// 解析元素（标签）节点
	compileElement(node) {
		// 思路：所谓指令，就是 HTML 的一个 v 开头的特殊属性
		// 1.获取当前节点下所有的属性
		let attributes = node.attributes // 类数组
		Utils.toArray(attributes).forEach(attr => {

			let attrName = attr.name

			// 2.解析Vue的指令（ v- 开头的）
			if (Utils.isDirective(attrName)) {
				let attrValue = attr.value

				if (Utils.isEventDirective(attrName)) {
					// 解析 v-on 指令   给当前元素注册事件
					let eventType = attrName.startsWith('v-on') ? attrName.split(':')[1] : attrName.split('@')[1] // 事件类型
					node.addEventListener(eventType, this.vm.$methods[attrValue].bind(this.vm))
				} else {
					DirectivesUtils[type](node, this.vm, attrValue)
				}
			}
		})
	}

	// 解析文本节点
	compileText(node) {
		let txt = node.textContent
		let reg = /\{\{(.+)\}\}/
		if (reg.test(txt)) {
			let expr = RegExp.$1 // $1 拿到第一个分组
			node.textContent = txt.replace(reg, this.vm.$data[expr])

			// 新增一个观察者，传入回调，通过回调函数直接更新
			new Watcher(this.vm, expr, (newValue, oldValue) => {
				node.textContent = txt.replace(reg, newValue)
			})
		}
	}
}

/* 
 * 工具方法 
 */
const Utils = {
	// 类数组 ---> 数组
	toArray(likeArray) {
		return [].slice.call(likeArray)
	},
	// 是否是元素节点 | 1：元素节点 | 3：文本节点
	isElementNode(node) {
		return node.nodeType === 1
	},
	isTextNode(node) {
		return node.nodeType === 3
	},
	// 是否是指令 - ES6 字符串方法，是否以某个开头
	isDirective(attrName) {
		return attrName.startsWith('v-') || attrName.startsWith(':') || attrName.startsWith('@')
	},
	// 是否是一个事件指令 ：v-on:click 这样的
	isEventDirective(attrName) {
		return ttrName.startsWith('v-on') || attrName.startsWith('@')
	}
}

/* 
 * 指令解析方法 
 */
const DirectivesUtils = {

	// 处理 v-text 指令
	text(node, vm, attrValue) {
		node.textContent = vm.$data[attrValue]
		new Watcher(vm, attrValue, (newValue, oldValue) => {
			node.textContent = newValue
		})
	},

	// 解析 v-html 指令
	html(node, vm, attrValue) {
		node.innerHTML = vm.$data[attrValue]
		new Watcher(vm, attrValue, (newValue, oldValue) => {
			node.innerHTML = newValue
		})
	},

	// 解析 v-model 指令
	model(node, vm, attrValue) {
		node.value = vm.$data[attrValue]

		// 注册事件
		node.addEventListener('input', e => {
			vm.$data[attrValue] = event.target.value
		})

		new Watcher(vm, attrValue, (newValue, oldValue) => {
			node.value = newValue
		})
	}
}
```

## vue/reactivity/watcher.js

观察者，哪里用到数据，哪里就会有观察者，数据出现变动后被观察者会通知观察者更新数据

1. 初始化观察者时传入 vue 实例，还有被观察的数据，和一个数据变动后触发的回调
2. 此时定义全局的一个依赖目标 Dep.target 为当前的 Watcher实例，获取当前的值作为已定义的历史值 oldValue ，此时获取时第二次触发数据的 get，而此时 Dep.target 存在，使用当前数据的 dep 实例（专属）将该观察者 Dep.target 收集进依赖箱 subs[] ，此时该被观察者压入了第一个观察者对象。接着返回值给 oldValue ，接着清空全局的 Dep.target 对象，也就是说同一时间只处理一个观察者对象
3. 

```js
// vue/reactivity/watcher.js

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
```

## vue/reactivity/dep.js

依赖收集器，也是被观察者，每个数据对应一个

1. Dep 类定义了每个 dep 实例都有自己的依赖收集箱 subs ，用来装一堆观察者，同时有一个添加观察者的 push 方法，和一个通知各观察者的 notify 方法，使用观察者 watcher 的 update 方法来执行更新数据的操作

```js
// vue/reactivity/dep.js

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
```

# 响应式更改值流程

```js
document.getElementById('update').addEventListener('click', function(){
  vm.$data.text = 'second mount data: \n' + new Date();
})
```

## 触发 set

1. 通过点击页面按钮修改某变量，来触发变量的 set
2. 再来看之前 set 定义的内容，如果新设定的值与原来相同，直接返回；如果为对象，再次对该对象进行数据劫持；接着保存当前的新值，通知观察者更新

```js
// vue/reactivity/observer.js

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
      value = newValue; // 此时只是更新到了 vue 实例的数据上，本就是对 data 的拦截
      dep.notify();
    }
  })
}
```

## dep 通知更新

给依赖箱中所有的观察者都通知，数据更新啦，你们也都更新下

```js
// vue/reactivity/dep.js

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
```

## watcher 执行更新

1. 获取创建 watcher 实例时保存的数据旧值
2. 从当前 vue 实例的 data 获取更新后的变量
3. 再一次触发 该数据的 get 方法，直接返回值，注意此时的值已经被 set 更新过了
4. 再次判断新旧值，如不同则触发创建 watcher 实例时传入的回调函数，直接修改节点的文本内容，将其中正则匹配到的变量块 `{{ }}` 用参数传来的新值替换。完成此次更新

```js
// vue/reactivity/watcher.js

export default class Watcher {
  constructor (vm, key, cb) {
    this.vm = vm;
    this.key = key;
    this.cb = cb;

    Dep.target = this;

    this.oldValue = this.vm.$data[key];

    Dep.target = null;
  }

  update () {
    let oldValue = this.oldValue;
    let newValue = this.vm.$data[this.key]; // 从当前 vue 实例直接获取
    if (oldValue !== newValue) { // 再做判断
      this.cb(newValue, oldValue); // 通过回调函数直接更新
    }
  }
}
```

# 参考

探索 Vue.js 响应式原理: https://www.yuque.com/wangpingan/cute-frontend/ar4qkb#xfZjx