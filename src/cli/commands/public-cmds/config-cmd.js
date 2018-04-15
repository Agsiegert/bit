/** @flow */

import rightpad from 'pad-right';
import chalk from 'chalk';
import Command from '../../command';
import { objectToTupleArray } from '../../../utils';
// import { config } from '../../../api/consumer';
const config = require('../../../api/consumer/lib/global-config');

export default class Config extends Command {
  name = 'config';
  description = 'global config management.\n  https://docs.bitsrc.io/docs/conf-config.html';
  alias = '';
  commands = [new ConfigSet(), new ConfigDel(), new ConfigGet(), new ConfigList()];
  opts = [];
  migration = false;

  action(): Promise<any> {
    return config.list();
  }

  report(conf: { [string]: string }): string {
    return objectToTupleArray(conf)
      .map((tuple) => {
        tuple[0] = rightpad(tuple[0], 30, ' ');
        return tuple.join('');
      })
      .join('\n');
  }
}

class ConfigSet extends Command {
  name = 'set <key> <val>';
  description = 'set a global configuration';
  alias = '';
  opts = [];

  action([key, value]: [string, string]): Promise<any> {
    return config.set(key, value);
  }

  report(conf: { [string]: string }): string {
    return chalk.green('added configuration successfully');
  }
}

class ConfigGet extends Command {
  name = 'get <key>';
  description = 'get a global configuration';
  alias = '';
  opts = [];

  action([key]: [string]): Promise<any> {
    return config.get(key);
  }

  report(value: string): string {
    return value;
  }
}

class ConfigList extends Command {
  name = 'list';
  description = 'list all configuration(s)';
  alias = '';
  opts = [];

  action(): Promise<any> {
    return config.list();
  }

  report(conf: { [string]: string }): string {
    return objectToTupleArray(conf)
      .map((tuple) => {
        return tuple.join('     ');
      })
      .join('\n');
  }
}

class ConfigDel extends Command {
  name = 'del <key>';
  description = 'delete given key from global configuration';
  alias = '';
  opts = [];

  action([key]: [string]): Promise<any> {
    return config.del(key);
  }

  report(conf: { [string]: string }): string {
    return chalk.green('deleted successfully');
  }
}
