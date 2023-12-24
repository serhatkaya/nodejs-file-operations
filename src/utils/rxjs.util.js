const { Observable, Subject } = require('rxjs');
const { delay } = require('rxjs/operators');
const { take } = require('rxjs');

function pauseWhen(conditionFn) {
  return (source) => {
    return new Observable((observer) => {
      const resumeSignal$ = new Subject();
      let paused = false;

      const sourceSubscription = source.subscribe({
        next(value) {
          if (paused) {
            const resumeSubscription = resumeSignal$
              .pipe(delay(0))
              .subscribe(() => {
                observer.next(value);
                resumeSubscription.unsubscribe();
              });
          } else {
            observer.next(value);
          }

          if (conditionFn(value)) {
            paused = true;
          }
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          observer.complete();
          sourceSubscription.unsubscribe();
          resumeSignal$.complete();
        },
      });

      return sourceSubscription;
    });
  };
}

function toPromise(observable) {
  // Note: We might need to remove take(1)
  return new Promise((resolve, reject) => {
    observable.pipe(take(1)).subscribe({
      next: (value) => resolve(value),
      error: (error) => reject(error),
    });
  });
}

module.exports = { pauseWhen, toPromise };
