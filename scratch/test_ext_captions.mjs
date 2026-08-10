import { movieBoxService } from '../src/lib/moviebox.ts';

async function test() {
  try {
    const sources = await movieBoxService.getSources('2966181623634480144', 0, 0);
    console.log('Sources downloads count:', sources.downloads?.length);
    console.log('Sources captions count:', sources.captions?.length);
    console.log('Captions:', JSON.stringify(sources.captions, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
