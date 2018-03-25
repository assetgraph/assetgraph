module.exports = iterable => {
  return new Proxy(iterable, {
    set(target, property, value) {
      for (const item of target) {
        item[property] = value;
      }
    },

    get(target, property) {
      if (property === Symbol.iterator) {
        return target[Symbol.iterator].bind(target);
      } else if (typeof target[0][property] === 'function') {
        return function(...args) {
          const ret = [];

          let i = 0;
          for (const item of target) {
            i++;

            if (typeof item[property] === 'undefined') {
              throw new TypeError(
                `Item ${i} of the iterable is missing the ${property}() method`
              );
            }

            ret.push(Reflect.apply(item[property], item, args));
          }

          if (ret.some(value => value && typeof value.then === 'function')) {
            return Promise.all(ret);
          } else {
            return ret;
          }
        };
      } else {
        return target.map(item => item[property]);
      }
    }
  });
};
