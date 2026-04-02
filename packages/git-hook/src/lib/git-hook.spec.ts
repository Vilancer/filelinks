import { gitHook } from './git-hook';

describe('gitHook', () => {
  it('should work', () => {
    expect(gitHook()).toEqual('git-hook');
  });
});
