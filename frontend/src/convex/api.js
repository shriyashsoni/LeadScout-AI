/* eslint-disable */
/**
 * Manual API utility fallback for frontend.
 */

const makeAnyApi = () => {
  return new Proxy({}, {
    get(target, prop) {
      if (typeof prop === 'string' && prop !== 'then' && prop !== 'toJSON') {
        return new Proxy({}, {
          get(target2, prop2) {
            if (typeof prop2 === 'string' && prop2 !== 'then' && prop2 !== 'toJSON') {
              return {
                isApiFunction: true,
                path: `${prop}:${prop2}`
              };
            }
          }
        });
      }
    }
  });
};

export const api = makeAnyApi();
export const internal = api;
export default api;
