import RequestTabs from "../components/Request/RequestTabs";
import SendedRequest from "../components/Request/SendedRequest";
import ReceivedRequest from "../components/Request/ReceivedRequest";
import useRequestFetcher from "../components/Request/useRequestFetcher";
import AdminNavbar from "../admincomponents/AdminNavbar";
import ProfileSidebar from "../components/ProfileSidebar";
import UserSideBar from "../components/UserSideBar";
import Footer from "../components/Footer";
import { useEffect, useState } from "react";

const Work = () => {
  const { currentTab, setCurrentTab, sendedRequest, receivedRequest, loading, user } = useRequestFetcher();

  const [showContent, setShowContent] = useState(false);
  const [data, setData] = useState([]); // 🆕 added for tracking updated data

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 50); // small delay
    return () => clearTimeout(timer); // cleanup
  }, []);

  return showContent ? (
    <>
      <AdminNavbar />
      <UserSideBar />
      <ProfileSidebar />

      <div className="mt-40">
        <section className="bg-gray-50 py-5">
          <div className="container">
            <RequestTabs currentTab={currentTab} setCurrentTab={setCurrentTab} />

            {loading ? (
              // <LoadingSpinner />
              <p className="loader"></p>
            ) : currentTab === "Received Request" ? (
              <ReceivedRequest data={receivedRequest} user={user} setData={setData} />
            ) : (
              <SendedRequest data={sendedRequest} user={user} setData={setData} />
            )}
          </div>
        </section>
      </div>

      <Footer />
    </>
  ) : null;
};

export default Work;