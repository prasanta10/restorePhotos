import { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import { useState } from "react";
import { UploadDropzone } from "react-uploader";
import { Uploader } from "uploader";
import Footer from "../components/Footer";
import Header from "../components/Header";
import LoadingDots from "../components/LoadingDots";
import Toggle from "../components/Toggle";
import appendNewToName from "../utils/appendNewToName";
import downloadPhoto from "../utils/downloadPhoto";
import NSFWPredictor from "../utils/nsfwCheck";
import va from "@vercel/analytics";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import { Rings } from "react-loader-spinner";

// Configuration for the uploader
const uploader = Uploader({
  apiKey: !!process.env.NEXT_PUBLIC_UPLOAD_API_KEY
    ? process.env.NEXT_PUBLIC_UPLOAD_API_KEY
    : "free",
});

const Home: NextPage = () => {
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [restoredLoaded, setRestoredLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data, mutate } = useSWR("/api/remaining", fetcher);
  const { data: session, status } = useSession();

  const options = {
    maxFileCount: 1,
    mimeTypes: ["image/jpeg", "image/png", "image/jpg"],
    editor: { images: { crop: false } },
    styles: { colors: { primary: "#000" } },
    onValidate: async (file: File): Promise<undefined | string> => {
      let isSafe = false;
      try {
        isSafe = await NSFWPredictor.isSafeImg(file);
        if (!isSafe) va.track("NSFW Image blocked");
      } catch (error) {
        console.error("NSFW predictor threw an error", error);
      }
      if (!isSafe) {
        return "Detected a NSFW image which is not allowed.";
      }
      if (data.remainingGenerations === 0) {
        return "No more generations left for the day.";
      }
      return undefined;
    },
  };

  const UploadDropZone = () => (
    <UploadDropzone
      uploader={uploader}
      options={options}
      onUpdate={(file) => {
        if (file.length !== 0) {
          console.log("file",file[0].fileUrl);
          setPhotoName(file[0].originalFile.originalFileName);
          setOriginalPhoto(file[0].fileUrl);
          generatePhoto(file[0].fileUrl);
        }
      }}
      width="670px"
      height="250px"
    />
  );

  async function generatePhoto(fileUrl: string) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setLoading(true);

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageUrl: fileUrl }),
    });

    let newPhoto = await res.json();
    if (res.status !== 200) {
      setError(newPhoto);
    } else {
      mutate();
      setRestoredImage(newPhoto);
    }
    setLoading(false);
  }

  return (
    <div className="flex max-w-6xl mx-auto flex-col items-center justify-center py-2 min-h-screen">
      <Head>
        <title>Plagiarism Checker</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header photo={session?.user?.image || undefined} />
      <main className="flex flex-1 w-full flex-col items-center justify-center text-center px-4 mt-4 sm:mb-0 mb-8">
        <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold tracking-normal text-slate-900 sm:text-6xl mb-5">
          Get Text from Image
        </h1>

        <div className="flex justify-between items-center w-full flex-col mt-4">
          {status === "loading" ? (
            <div className="max-w-[670px] h-[250px] flex justify-center items-center">
              <Rings
                height="100"
                width="100"
                color="black"
                radius="6"
                wrapperStyle={{}}
                wrapperClass=""
                visible={true}
                ariaLabel="rings-loading"
              />
            </div>
          ) : status === "authenticated" && !originalPhoto ? (
            <UploadDropZone />
          ) : (
            !originalPhoto && (
              <div className="h-[250px] flex flex-col items-center space-y-6 max-w-[670px] -mt-8">
                <div className="max-w-xl text-gray-600">
                  Sign in below with Google to create a free account and restore
                  your photos today. You will be able to restore 5 photos per
                  day for free.
                </div>
                <button
                  onClick={() => signIn("google")}
                  className="bg-gray-200 text-black font-semibold py-3 px-6 rounded-2xl flex items-center space-x-2"
                >
                  <Image
                    src="/google.png"
                    width={20}
                    height={20}
                    alt="google's logo"
                  />
                  <span>Sign in with Google</span>
                </button>
              </div>
            )
          )}
          {originalPhoto && !restoredImage && (
            <Image
              alt="original photo"
              src={originalPhoto}
              className="rounded-2xl"
              width={475}
              height={475}
            />
          )}
          {restoredImage && originalPhoto && (
            <div className="flex sm:space-x-4 sm:flex-row flex-col">
              <div>
                <h2 className="mb-1 font-medium text-lg">Photo</h2>
                <Image
                  alt="original photo"
                  src={originalPhoto}
                  className="rounded-2xl relative"
                  width={475}
                  height={475}
                />
              </div>
              <div className="sm:mt-0 mt-8">
                <h2 className="mb-1 font-medium text-lg">Text</h2>
                <p className='text-lg mt-2 sm:mt-0 w-[500px] ' >{restoredImage}</p>
              </div>
            </div>
          )}
          {loading && (
            <button
              disabled
              className="bg-black rounded-full text-white font-medium px-4 pt-2 pb-3 mt-8 hover:bg-black/80 w-40"
            >
              <span className="pt-4">
                <LoadingDots color="white" style="large" />
              </span>
            </button>
          )}
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mt-8 max-w-[575px]"
              role="alert"
            >
              <div className="bg-red-500 text-white font-bold rounded-t px-4 py-2">
                Please try again in 24 hours
              </div>
              <div className="border border-t-0 border-red-400 rounded-b bg-red-100 px-4 py-3 text-red-700">
                {error}
              </div>
            </div>
          )}
          <div className="flex space-x-2 justify-center">
            {originalPhoto && !loading && (
              <button
                onClick={() => {
                  setOriginalPhoto(null);
                  setRestoredImage(null);
                  setRestoredLoaded(false);
                  setError(null);
                }}
                className="bg-black rounded-full text-white font-medium px-4 py-2 mt-8 hover:bg-black/80 transition"
              >
                Upload New Photo
              </button>
            )}
            {/* {restoredLoaded && (
              <button
                onClick={() => {
                  downloadPhoto(restoredImage!, appendNewToName(photoName!));
                }}
                className="bg-white rounded-full text-black border font-medium px-4 py-2 mt-8 hover:bg-gray-100 transition"
              >
                Download Restored Photo
              </button>
            )} */}
          </div>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
};

export default Home;
