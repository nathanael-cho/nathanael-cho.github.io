import { postFramework, PostProps } from './helper';
import WaterSimulation from '../../components/WaterSimulation';


function SeventhPost({ date }: PostProps): JSX.Element {
    const content = <WaterSimulation />;

    return postFramework("Simulating a Winter Lake in WebAssembly", content, date);
}


export default SeventhPost;
