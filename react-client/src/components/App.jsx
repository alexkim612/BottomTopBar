import React from 'react';
import styled from 'styled-components';
import axios from 'axios';
import Queue from './Queue.jsx';
import Progress from './Progress.jsx';
import VolumeBar from './VolumeBar.jsx';
import Image from './Image.jsx';
import ArtistTitle from './ArtistTitle.jsx';

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      initial: [], // Initial load of songs
      currentIdx: 0, // Current song in array
      song: {}, // song with properties of url, image, title, artist,
      seeking: 0, // Seeking time
      volume: 100, // Volume of audio
      previousVol: 100, // Volume that was altered
      pop: false, // Pop up the volume slider
      queuepop: false, // Pop up the queue
      playing: false, // State of the song
      shuffle: false, // Shuffle songs
      loop: false, // replay song
      loopAll: false, // replay song infinitely
      mute: false, // set audio volume to 0
      startTime: '0:00', // Current time
      endTime: '0:00', // Duration of song
    };

    this.handleChange = this.handleChange.bind(this);
    this.popUpVolume = this.popUpVolume.bind(this);
    this.popUpQueue = this.popUpQueue.bind(this);
    this.playSong = this.playSong.bind(this);
    this.pauseSong = this.pauseSong.bind(this);
    this.goBack = this.goBack.bind(this);
    this.skip = this.skip.bind(this);
    this.repeat = this.repeat.bind(this);
    this.repeatAll = this.repeatAll.bind(this);
    this.repeatNone = this.repeatNone.bind(this);
    this.shuffle = this.shuffle.bind(this);
    this.mute = this.mute.bind(this);
    this.check = (cb, wait) => {
      setInterval(cb, wait);
    };
    this.random = () => {
      // Idx between 0 and initial array length
      const { initial } = this.state;
      const randomIdx = Math.floor(Math.random() * initial.length);
      return randomIdx;
    };
  }

  // Initial call to load player with song and queue with songs.
  // Default behavior of component based on SoundClound does not
  // load queue with songs nor does the player have a song loaded initially.
  // Songs only get added to the queue when user adds them.
  componentDidMount() {
    // If my component needed to add songs
    // Make get request to server
    // load app with songs data that includes
    // link to Amazon S3 where the images and actual song will be served

    // User interacts with songs that are already stored on the app
    // When they play/pause, skip, go back, etc...
    this.getSongs();
  }

  getSongs() {
    axios.get('http://localhost:3000/initial')
      .then((res) => {
        // console.log(res);
        this.setState({
          initial: res.data,
        }, () => {
          const { initial, currentIdx } = this.state;
          this.setState({ song: initial[currentIdx] });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  handleChange(event, param) {
    const { name, value } = event.target;
    const song = param;
    this.setState({
      [name]: value,
    }, () => {
      // Change song time to slider value
      if (name === 'seeking') {
        song.currentTime = (value / 100) * song.duration;
      } else if (name === 'volume') {
        if (value > 0) {
          this.setState({ mute: false });
        }
        // Change song volume to slider value
        song.volume = value / 100;
        // Keep track of previous volume setting for when user unmutes
        this.setState({ previousVol: value });
      }
    });
  }

  popUpVolume() {
    // Change visibility of the volume slider
    this.setState((state) => ({ pop: !state.pop }));
  }

  popUpQueue() {
    // Change visibility of the queue pop up
    this.setState((state) => ({ queuepop: !state.queuepop }));
  }

  playSong(song) {
    // Set state to true, start interval, and play song
    this.setState({ playing: true }, () => {
      const callback = () => {
        // Constantly update startTime and slider value
        const currentSeeking = (song.currentTime / song.duration) * 100;
        const currentStartTime = Math.floor(song.currentTime);

        song.ontimeupdate = () => {
          this.setState({ seeking: currentSeeking }, () => {
            if (song.ended) {
              this.setState({ playing: false });
            }
          });
          this.updateTime(currentStartTime);
        };
      };
      // Set up interval to constantly update startTime and progress bar
      this.check(callback, 500);
      // play song
      song.play();
      // Convert song duration to right format
      this.convertDuration(song.duration);
    });
  }

  pauseSong(song) {
    // Set state to false, clear interval, and pause song
    this.setState({ playing: false }, () => {
      clearInterval(this.check);
      song.pause();
    });
  }

  goBack() {
    // Go back one from current index
    const { currentIdx, initial, shuffle } = this.state;
    if (currentIdx !== 0) {
      // If shuffle is true, generate random idx
      if (shuffle) {
        const randomIdx = this.random();
        this.setState({ currentIdx: randomIdx, song: initial[randomIdx] });
      } else {
        // Otherwise go back one index
        this.setState((state) => ({ currentIdx: state.currentIdx - 1 }), () => {
          this.setState({ song: initial[this.state.currentIdx] });
        });
      }
    }
  }

  skip() {
    // Go forward one from current index
    const { initial, currentIdx, shuffle } = this.state;
    // If shuffle is true, generate random idx
    if (shuffle) {
      const randomIdx = this.random();
      this.setState({ currentIdx: randomIdx, song: initial[randomIdx] });
    } else {
      // Otherwise go forward one index
      this.setState({ currentIdx: currentIdx + 1 }, () => {
        this.setState({ song: initial[this.state.currentIdx] });
      });
    }
  }

  repeat(song) {
    // Set song loop to true
    this.setState({ loop: true }, () => {
      const { loop } = this.state;
      song.loop = loop;
    });
  }

  repeatAll(song) {
    // To be implemented
    // Loop through all the songs in the array
    // Iterate through each song and playing them
    song.loop = false;
    this.setState({ loopAll: true });
  }

  repeatNone() {
    this.setState({ loop: false, loopAll: false });
  }

  shuffle() {
    this.setState((state) => ({ shuffle: !state.shuffle }));
  }

  mute(song) {
    this.setState((state) => ({ mute: !state.mute }), () => {
      const { mute, previousVol } = this.state;
      if (mute) {
        song.volume = 0;
        this.setState({ volume: 0 });
      } else {
        song.volume = previousVol / 100;
        this.setState({ volume: previousVol });
      }
    });
  }

  // Format time in minutes:seconds -> 1:23
  updateTime(time) {
    const minutes = Math.floor(time / 60).toString();
    let seconds = time % 60;
    seconds = seconds < 10 ? `:0${seconds}` : `:${seconds}`;
    const displayTime = minutes + seconds;
    this.setState({ startTime: displayTime });
  }

  convertDuration(time) {
    const minutes = Math.floor(time / 60).toString();
    let seconds = Math.floor(time % 60);
    seconds = seconds < 10 ? `:0${seconds}` : `:${seconds}`;
    const displayTime = minutes + seconds;
    this.setState({ endTime: displayTime });
  }

  render() {
    const {
      seeking, volume, pop, queuepop, song, playing, startTime, endTime, loop, loopAll, shuffle,
    } = this.state;

    // The audio source. Will use audio properties for functionality.
    const sng = document.getElementById('songsrc');

    // Pop up volume and queue
    const volVisibility = pop ? 'visible' : 'hidden';
    const queueVisibility = queuepop ? 'visible' : 'hidden';

    // Repeat button
    let repeatButton;
    if (loopAll && loop) {
      repeatButton = <RepeatAll onClick={this.repeatNone} />;
    } else if (loop) {
      repeatButton = <RepeatOne onClick={() => { this.repeatAll(sng); }} />;
    } else {
      repeatButton = <Repeat onClick={() => { this.repeat(sng); }} />;
    }

    return (
      <PlayBackContainer>
        <audio src={song.song_url} type="audio/mpeg" id="songsrc">
          <track kind="captions" />
        </audio>
        <section className="player">
          <PlayBackbg />
          <ButtonsContainer>
            <Back onClick={this.goBack} />
            {playing ? <Pause onClick={() => { this.pauseSong(sng); }} />
              : <Play onClick={() => { this.playSong(sng); }} />}
            <Forward onClick={this.skip} />
            {shuffle ? <ShuffleTrue onClick={this.shuffle} /> : <Shuffle onClick={this.shuffle} />}
            {repeatButton}
            <ProgressContainer>
              <Start>{startTime}</Start>
              <Progress change={this.handleChange} val={seeking} song={sng} />
              <End>{endTime}</End>
            </ProgressContainer>
            <VolumeContainer>
              {volume === 0
                ? <Mute onMouseEnter={this.popUpVolume} onClick={() => { this.mute(sng); }} />
                : <Volume onMouseEnter={this.popUpVolume} onClick={() => { this.mute(sng); }} />}
              <VolumeBar
                leave={this.popUpVolume}
                val={volume}
                change={this.handleChange}
                song={sng}
                visible={volVisibility}
              />
            </VolumeContainer>
            <SongInfoContainer>
              <Image image={song.song_image} />
              <ArtistTitle artist={song.artist} title={song.title} />
              <Heart />
              <Queuebutton onClick={this.popUpQueue} />
            </SongInfoContainer>
            <Queue visible={queueVisibility} />
          </ButtonsContainer>
        </section>
      </PlayBackContainer>
    );
  }
}

// Buttons
const Button = styled.button`
  position: relative;
  visibility: visible;
  background-repeat: no-repeat;
  background-position: 40%;
  background-color: transparent;
  width: 24px;
  height: 100%;
  margin: 0 0 0 12px;
  border: 0;
  cursor: pointer;
`;

// "data:image/svg+xml,"
// data:image/svg+xml,

const Back = styled(Button)`
  /* background-image: url('data:image/svg+xml,
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <path fill="%23333" d="M7 6h2v12H7V6zm2 6l8 6V6l-8 6z"/></svg>'); */
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTcgNmgydjEySDdWNnptMiA2bDggNlY2bC04IDZ6Ii8+PC9zdmc+Cg==);
`;

const Play = styled(Button)`
  /* background-image: url('data:image/svg+xml,
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <path fill="%23333" d="M8 5v14l11-7z"/></svg>'); */
  background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTggNXYxNGwxMS03eiIvPjwvc3ZnPgo=);
`;

const Pause = styled(Button)`
  /* background-image: url('data:image/svg+xml,
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <path fill="%23333" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'); */
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTYgMTloNFY1SDZ2MTR6bTgtMTR2MTRoNFY1aC00eiIvPjwvc3ZnPgo=");
`;

const Forward = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTcgMThsOC02LTgtNnYxMnptOC0xMnYxMmgyVjZoLTJ6Ii8+PC9zdmc+Cg==");
`;

const Shuffle = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTEzLjU4NiAxN2wtOC04SDNWN2gzLjQxNGw4IDhIMTd2MmgtMy40MTR6TTMgMTVoMi41ODZsMi4yMDctMi4yMDcgMS40MTQgMS40MTQtMi41MDEgMi41MDEtLjI5My4yOTJIM3YtMnptMTQtNmgtMi41ODZsLTIuMjA3IDIuMjA3LTEuNDE0LTEuNDE0TDEzLjU4NiA3SDE3djJ6bTQgN2wtNCAzdi02bDQgM3ptMC04bC00IDNWNWw0IDN6Ii8+PC9zdmc+Cg==");
`;

const ShuffleTrue = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iI2Y1MCIgZD0iTTEzLjU4NiAxN2wtOC04SDNWN2gzLjQxNGw4IDhIMTd2MmgtMy40MTR6TTMgMTVoMi41ODZsMi4yMDctMi4yMDcgMS40MTQgMS40MTQtMi41MDEgMi41MDEtLjI5My4yOTJIM3YtMnptMTQtNmgtMi41ODZsLTIuMjA3IDIuMjA3LTEuNDE0LTEuNDE0TDEzLjU4NiA3SDE3djJ6bTQgN2wtNCAzdi02bDQgM3ptMC04bC00IDNWNWw0IDN6Ii8+PC9zdmc+Cg==");
`;

const Repeat = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTEyIDhIOWE0IDQgMCAxIDAgMCA4aDZhNCA0IDAgMCAwIDIuMTA0LTcuNDAzbDEuNzctMS4xOC4wMi4wMThBNiA2IDAgMCAxIDE1IDE4SDlBNiA2IDAgMSAxIDkgNmgzVjRsNCAzLTQgM1Y4eiIvPjwvc3ZnPgo=");
  margin-right: 20px;
`;

const RepeatOne = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iI2Y1MCIgZD0iTTExLjAyNyAxNmE0LjU1IDQuNTUgMCAwIDAgLjIzIDJIOUE2IDYgMCAxIDEgOSA2aDNWNGw0IDMtNCAzVjhIOWE0IDQgMCAxIDAgMCA4aDIuMDI3em03LjcyNS0yLjYxYTMuOTk3IDMuOTk3IDAgMCAwLTEuNjQ4LTQuNzkybDEuNzctMS4xOC4wMi4wMTdBNS45ODcgNS45ODcgMCAwIDEgMjEgMTJjMCAxLjMtLjQxMyAyLjUwMy0xLjExNiAzLjQ4NmE0LjQ5NiA0LjQ5NiAwIDAgMC0xLjEzMi0yLjA5NnoiLz48cGF0aCBmaWxsPSIjZjUwIiBkPSJNMTUuNSAyMGEzLjUgMy41IDAgMSAxIDAtNyAzLjUgMy41IDAgMCAxIDAgN3ptLS41LTV2NGgxdi00aC0xem0tMSAwdjFoMXYtMWgtMXoiLz48L3N2Zz4K");
  margin-right: 20px;
`;

const RepeatAll = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iI2Y1MCIgZD0iTTEyIDhIOWE0IDQgMCAxIDAgMCA4aDZhNCA0IDAgMCAwIDIuMTA0LTcuNDAzbDEuNzctMS4xOC4wMi4wMThBNiA2IDAgMCAxIDE1IDE4SDlBNiA2IDAgMSAxIDkgNmgzVjRsNCAzLTQgM1Y4eiIvPjwvc3ZnPgo=");
  margin-right: 20px;
`;

const Volume = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTQgOWg0LjAwMkwxMiA1djE0Yy0yLjQ0Ni0yLjY2Ny0zLjc3OC00LTMuOTk4LTRINFY5em0xMCA0YTEgMSAwIDAgMCAwLTJWOWEzIDMgMCAwIDEgMCA2di0yem0wIDRhNSA1IDAgMCAwIDAtMTBWNWE3IDcgMCAwIDEgMCAxNHYtMnoiLz48L3N2Zz4K");
  padding: 10px;
  margin-bottom: 15px;
`;

const Mute = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZmlsbD0iIzMzMyIgZD0iTTE4IDEwLjU4NGwtMi4yOTMtMi4yOTEtMS40MTQgMS40MTQgMi4yOTMgMi4yOTEtMi4yOTEgMi4yOTEgMS40MTQgMS40MTUgMi4yOTItMi4yOTIgMi4yOTQgMi4yOTIgMS40MTQtMS40MTUtMi4yOTMtMi4yOTEgMi4yOTEtMi4yOS0xLjQxNC0xLjQxNS0yLjI5MiAyLjI5MXpNNCA5aDQuMDAyTDEyIDV2MTRjLTIuNDQ2LTIuNjY3LTMuNzc4LTQtMy45OTgtNEg0Vjl6Ii8+PC9zdmc+Cg==");
  padding: 10px;
  margin-bottom: 15px;
`;

const Heart = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+DQo8c3ZnIHdpZHRoPSIxNnB4IiBoZWlnaHQ9IjE2cHgiIHZpZXdCb3g9IjAgMCAxNiAxNiIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWxuczpza2V0Y2g9Imh0dHA6Ly93d3cuYm9oZW1pYW5jb2RpbmcuY29tL3NrZXRjaC9ucyI+DQogICAgPCEtLSBHZW5lcmF0b3I6IFNrZXRjaCAzLjAuMyAoNzg5MSkgLSBodHRwOi8vd3d3LmJvaGVtaWFuY29kaW5nLmNvbS9za2V0Y2ggLS0+DQogICAgPHRpdGxlPnN0YXRzX2xpa2VzX2dyZXk8L3RpdGxlPg0KICAgIDxkZXNjPkNyZWF0ZWQgd2l0aCBTa2V0Y2guPC9kZXNjPg0KICAgIDxkZWZzLz4NCiAgICA8ZyBpZD0iUGFnZS0xIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIiBza2V0Y2g6dHlwZT0iTVNQYWdlIj4NCiAgICAgICAgPHBhdGggZD0iTTEwLjgwNDk4MTgsMyBDOC43ODQ3MTU3OSwzIDguMDAwNjUyODUsNS4zNDQ4NjQ4NiA4LjAwMDY1Mjg1LDUuMzQ0ODY0ODYgQzguMDAwNjUyODUsNS4zNDQ4NjQ4NiA3LjIxMjk2Mzg3LDMgNS4xOTYwNDQ5NCwzIEMzLjQ5NDMxMzE4LDMgMS43NDgzNzQsNC4wOTU5MjY5NCAyLjAzMDA4OTk2LDYuNTE0MzA1MzIgQzIuMzczNzI3NjUsOS40NjY3Mzc3NSA3Ljc1NDkxOTE3LDEyLjk5Mjg3MzggNy45OTMxMDk1OCwxMy4wMDEwNTU3IEM4LjIzMTI5OTk4LDEzLjAwOTIzNzggMTMuNzMwOTgyOCw5LjI3ODUzNzggMTMuOTgxNDU5LDYuNTAxMjQwNSBDMTQuMTg3ODY0Nyw0LjIwMDk3MDIzIDEyLjUwNjcxMzYsMyAxMC44MDQ5ODE4LDMgWiIgaWQ9IkltcG9ydGVkLUxheWVycyIgZmlsbD0icmdiKDM0LCAzNCwgMzQpIiBza2V0Y2g6dHlwZT0iTVNTaGFwZUdyb3VwIi8+DQogICAgPC9nPg0KPC9zdmc+DQo=");
`;

const Queuebutton = styled(Button)`
  background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+CiAgPHBhdGggZmlsbD0iIzMzMyIgZD0iTTYgMTFoMTJ2Mkg2ek02IDdoOHYySDZ6TTYgMTVoMTJ2Mkg2ek0xNiAzdjZsNC0zeiI+PC9wYXRoPgo8L3N2Zz4=");
`;

// Timestamps
const Time = styled.div`
  width: 50px;
  height: 46px;
  line-height: 46px;
`;

const Start = styled(Time)`
  text-align: right;
  color: #f50;
`;

const End = styled(Time)`
  text-align: left;
  color: #333;
`;

// Background for whole container
const PlayBackbg = styled.div`
  border-top: 1px solid #cecece;
  background-color: #f2f2f2;
  position: absolute;
  visibility: visible;
  display: block;
  width: 100%;
  height: 100%;
`;

// Containers

const PlayBackContainer = styled.div`
  height: 48px;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  visibility: hidden;
  position: fixed;
  margin: auto;
`;

const ButtonsContainer = styled.div`
  display: flex;
  height: 100%;
  position: absolute;
  z-index: 10;
  border-top: 1px solid #cecece;
  justify-content: space-around;
`;

const VolumeContainer = styled.div`
  visibility: visible;
  height: 100%;
  display: flex;
  margin-right: 12px;
`;

const SongInfoContainer = styled.div`
  visibility: visible;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 360px;
`;

const ProgressContainer = styled.div`
  visibility: visible;
  display: flex;
`;

export default App;
