describe('Test againt files', () => {
  test('There should have a sketch test folder', () => {
    expect(process.env.TEST_SKETCH_DIRS).toBeTruthy();
  });
});
