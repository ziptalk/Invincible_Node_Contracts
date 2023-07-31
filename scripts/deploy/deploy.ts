import { deployAll } from "./deployAll";

const main = async () => {
  try {
    deployAll();
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
};

main();
