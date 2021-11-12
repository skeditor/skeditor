import fs from 'fs-extra';
import path from 'path';
import invariant from 'ts-invariant';
import JSZip from 'jszip';
import { SkyModel } from '../lib/editor/model';
import { CanvaskitPromised } from '../lib/editor/util/canvaskit';
import { Rect } from '../lib/editor/base';

const testDir = process.env.TEST_SKETCH_DIRS;

async function loadCase(filename: string) {
  const p = path.join(__dirname, 'cases', filename);
  const file = await fs.readFile(p);
  const jszip = await JSZip.loadAsync(file);
  return jszip;
}

async function loadModel(filename: string) {
  const jszip = await loadCase(filename);
  const model = new SkyModel();
  await model.readZipFile(jszip);
  return model;
}

describe('Test against files', () => {
  beforeAll(() => CanvaskitPromised);
  test('There should have a sketch test folder', () => {
    invariant(testDir);
    // expect(fs.statSync(testDir).isDirectory()).toBeTruthy();
    // const testFiles = fs.readdirSync(testDir).filter((file) => file.endsWith('.sketch'));
    // expect(testFiles.length).toBeGreaterThan(0);
  });

  test('load zip file', async () => {
    const model = await loadModel('empty.sketch');
    expect(model.pages.length).toBeGreaterThan(0);
    expect(model.isSupportedVersion).toBeTruthy();
  });

  test('simple sketch file', async () => {
    const model = await loadModel('simple.sketch');
    const r1 = model.queryPage('page1').queryLayer('r1');
    expect(r1).toBeTruthy();
    expect(r1.frame).toEqual(new Rect(0, 0, 100, 100));

    const r2 = model.queryPage('page1').queryLayer('r2');
    expect(r2).toBeTruthy();
    expect(r2.frame).toEqual(new Rect(100, 100, 100, 100));
  });
});
