import fs from 'fs-extra';
import path from 'path';
import { expect } from 'chai';
import Helper from '../e2e-helper';
import { ComponentNotFound, VersionNotFound } from '../../src/scope/exceptions';
import * as fixtures from '../fixtures/fixtures';

const barFooV1 = "module.exports = function foo() { return 'got foo'; };\n";
const barFooV2 = "module.exports = function foo() { return 'got foo v2'; };\n";
const barFooV3 = "module.exports = function foo() { return 'got foo v3'; };\n";
const noDiffMessage = 'no diff for';
const successDiffMessage = 'showing diff for';

describe('bit diff command', function () {
  this.timeout(0);
  const helper = new Helper();
  const barFooFile = path.join('bar', 'foo.js');
  before(() => {
    helper.reInitLocalScope();
  });
  after(() => {
    helper.destroyEnv();
  });
  describe('for non existing component', () => {
    it('show an error saying the component was not found', () => {
      const diffFunc = () => helper.runCmd('bit diff utils/non-exist');
      const error = new ComponentNotFound('utils/non-exist');
      helper.expectToThrow(diffFunc, error);
    });
  });
  describe('when there are no modified components', () => {
    it('show an error saying that there are no modified components', () => {
      const output = helper.runWithTryCatch('bit diff');
      expect(output).to.have.string('no modified components');
    });
  });
  describe('after the component was created', () => {
    before(() => {
      helper.createComponentBarFoo(barFooV1);
      helper.addComponentBarFoo();
    });
    it('before tagging it should indicate that there is no diff for that component', () => {
      const output = helper.diff('bar/foo');
      expect(output).to.have.string(noDiffMessage);
      expect(output).to.have.string('bar/foo');
    });
    describe('after the component was tagged', () => {
      before(() => {
        helper.tagAllWithoutMessage('', '0.0.5');
      });
      it('should still indicate that there is no diff for that component', () => {
        const output = helper.diff('bar/foo');
        expect(output).to.have.string(noDiffMessage);
        expect(output).to.have.string('bar/foo');
      });
      describe('and component was modified', () => {
        let diffOutput;
        before(() => {
          helper.createComponentBarFoo(barFooV2);
          diffOutput = helper.diff('bar/foo');
        });
        it('should show a success message', () => {
          expect(diffOutput).to.have.string(successDiffMessage);
        });
        it('should indicate the original files with ---', () => {
          expect(diffOutput).to.have.string(`--- ${barFooFile} (0.0.5 original)`);
        });
        it('should indicate the modified files with +++', () => {
          expect(diffOutput).to.have.string(`+++ ${barFooFile} (0.0.5 modified)`);
        });
        it('should show the deleted part with leading - (minus sign)', () => {
          expect(diffOutput).to.have.string("-module.exports = function foo() { return 'got foo'; };");
        });
        it('should show the added part with leading + (plus sign)', () => {
          expect(diffOutput).to.have.string("+module.exports = function foo() { return 'got foo v2'; };");
        });
      });
    });
  });
  describe('when there are several modified components and non modified components', () => {
    before(() => {
      helper.reInitLocalScope();
      helper.createComponentBarFoo(barFooV1);
      helper.addComponentBarFoo();
      helper.createFile('utils', 'is-type.js', fixtures.isType);
      helper.addComponent('utils/is-type.js');
      helper.createFile('utils', 'is-string.js', fixtures.isString);
      helper.addComponent('utils/is-string.js');
      helper.commitAllComponents();

      // modify only bar/foo and utils/is-type, not utils/is-string
      helper.createComponentBarFoo(barFooV2);
      helper.createFile('utils', 'is-type.js', fixtures.isTypeV2);
    });
    describe('running bit diff with no ids', () => {
      let output;
      before(() => {
        output = helper.diff();
      });
      it('should show diff for all modified components', () => {
        expect(output).to.have.string('bar/foo@0.0.1');
        expect(output).to.have.string('utils/is-type@0.0.1');
        expect(output).to.have.string(barFooV1);
        expect(output).to.have.string(barFooV2);
        expect(output).to.have.string(fixtures.isType);
        expect(output).to.have.string(fixtures.isTypeV2);
      });
      it('should not show non modified components', () => {
        expect(output).to.not.have.a.string('utils/is-string');
      });
    });
    describe('running bit diff with multiple ids', () => {
      let output;
      before(() => {
        output = helper.diff('utils/is-type utils/is-string');
      });
      it('should show diff for the modified components only', () => {
        expect(output).to.have.string(fixtures.isType);
        expect(output).to.have.string(fixtures.isTypeV2);
      });
      it('should not show diff for non modified components', () => {
        expect(output).to.not.have.string(fixtures.isString);
      });
      it('should mention the components with no diff', () => {
        expect(output).to.have.string('utils/is-string');
        expect(output).to.have.string(noDiffMessage);
      });
    });
  });
  describe('when a file is deleted and another is added', () => {
    let output;
    before(() => {
      helper.reInitLocalScope();
      helper.createComponentBarFoo(barFooV1);
      helper.addComponentBarFoo();
      helper.tagAllWithoutMessage();
      helper.createFile('bar', 'foo2.js', barFooV2);
      fs.removeSync(path.join(helper.localScopePath, 'bar/foo.js'));
      helper.addComponentWithOptions('bar/foo2.js', { i: 'bar/foo', m: 'bar/foo2.js' });
      helper.runCmd('bit status'); // to clean bitmap file
      output = helper.diff('bar/foo');
    });
    it('should indicate the deleted files as deleted', () => {
      expect(output).to.have.string(`--- ${barFooFile} (0.0.1 original)`);
      expect(output).to.have.string(`+++ ${barFooFile} (0.0.1 modified)`);
      // notice the leading minus sign
      expect(output).to.have.string(`-${barFooV1}`);
    });
    it('should indicate the added files as added', () => {
      const barFoo2File = path.join('bar', 'foo2.js');
      expect(output).to.have.string(`--- ${barFoo2File} (0.0.1 original)`);
      expect(output).to.have.string(`+++ ${barFoo2File} (0.0.1 modified)`);
      // notice the leading plus sign
      expect(output).to.have.string(`+${barFooV2}`);
    });
  });
  describe('component with multiple versions', () => {
    before(() => {
      helper.reInitLocalScope();
      helper.createComponentBarFoo(barFooV1);
      helper.addComponentBarFoo();
      helper.commitComponentBarFoo(); // 0.0.1
      helper.createComponentBarFoo(barFooV2);
      helper.commitComponentBarFoo(); // 0.0.2
      helper.createComponentBarFoo(barFooV3);
      helper.commitComponentBarFoo(); // 0.0.3
    });
    describe('diff between a non-exist version and current version', () => {
      it('should throw an VersionNotFound error', () => {
        const error = new VersionNotFound('1.0.6');
        const diffFunc = () => helper.diff('bar/foo 1.0.6');
        helper.expectToThrow(diffFunc, error);
      });
    });
    describe('diff between an earlier version and current version', () => {
      let output;
      before(() => {
        output = helper.diff('bar/foo 0.0.1');
      });
      it('should show the earlier version with leading - (minus sign)', () => {
        expect(output).to.have.string(`--- ${barFooFile} (0.0.1)`);
        expect(output).to.have.string(`-${barFooV1}`);
      });
      it('should show the current version with leading + (plus sign)', () => {
        expect(output).to.have.string(`+++ ${barFooFile} (0.0.3)`);
        expect(output).to.have.string(`+${barFooV3}`);
      });
    });
    describe('diff between two different versions', () => {
      let output;
      before(() => {
        output = helper.diff('bar/foo 0.0.1 0.0.2');
      });
      it('should show the first version with leading - (minus sign)', () => {
        expect(output).to.have.string(`--- ${barFooFile} (0.0.1)`);
        expect(output).to.have.string(`-${barFooV1}`);
      });
      it('should show the second version with leading + (plus sign)', () => {
        expect(output).to.have.string(`+++ ${barFooFile} (0.0.2)`);
        expect(output).to.have.string(`+${barFooV2}`);
      });
    });
    describe('diff between two versions with multiple ids (not supported)', () => {
      it('should throw an error', () => {
        const output = helper.runWithTryCatch('bit diff bar/foo bar/foo2 0.0.1 0.0.2');
        expect(output).to.have.string(
          'bit diff [id] [version] [to_version] syntax was used, however, 4 arguments were given instead of 3'
        );
      });
    });
    describe('diff of a certain version with multiple ids (not supported)', () => {
      it('should throw an error', () => {
        const output = helper.runWithTryCatch('bit diff bar/foo bar/foo2 0.0.1');
        expect(output).to.have.string(
          'bit diff [id] [version] syntax was used, however, 3 arguments were given instead of 2'
        );
      });
    });
  });
});
